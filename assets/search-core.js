/**
 * サイト内検索の「探し方」本体。
 *
 * 検索は2か所にある（共通ヘッダーの検索＝site-search.js／ページ一覧.html）。
 * 以前は探し方を別々に書いていて、片方だけ2語で引けないなどの食い違いが出た。
 * どちらもこのファイルの SITE_SEARCH_CORE.match を呼ぶ。直すときはここだけを直す。
 *
 * 探す場所と並べる順（1語ごとに点を足し、合計の高い順）：
 *   題名の先頭 100 ＞ 題名の途中 50 ＞ 見出し・検索キーワード 25 ＞ ファイル名・分類名 10 ＞ 本文 6〜11
 * 空白（全角も）で区切った語は「すべて含む」ページだけを出す。語ごとに当たる場所は違ってよい。
 * 全角英数と半角英数は同じものとして扱う（NFKC。「薬Ａ」でも「薬A」でも当たる）。
 *
 * 本文（assets/search-body.js）は build-search-index.js が作る。大きいので後から届くことがあり、
 * 届く前は題名と見出しだけで探す。
 */
(function () {
  function norm(s) {
    s = String(s == null ? '' : s);
    if (s.normalize) s = s.normalize('NFKC');
    return s.toLowerCase();
  }

  /** 入力を語に分ける（全角の空白でも区切る） */
  function words(q) {
    return norm(q).split(/\s+/).filter(Boolean);
  }

  /** 原文のような長いページは、どの語でも本文に当たりやすい。本文だけの当たりは控えめに数える */
  var LONG_BODY = 25000;

  /**
   * page = { title, terms: [見出し・キーワード], body: 本文（無ければ ''）, extra: ファイル名や分類名 }
   * 戻り値：当たらなければ null。当たれば
   *   { score, hitTerm（題名に無い語が当たった見出し）, snippet（本文だけに当たった語の前後）, inBody }
   */
  function match(page, ws) {
    if (!ws.length) return null;
    if (page._t === undefined) {
      page._t = norm(page.title);
      page._x = norm(page.extra || '');
    }
    if (page._termsSrc !== page.terms) {
      page._termsSrc = page.terms;
      page._terms = (page.terms || []).map(norm);
    }
    if (page._bodySrc !== page.body) {
      page._bodySrc = page.body;
      page._b = page.body ? page.body.toLowerCase() : '';   // 本文は索引を作るときに NFKC 済み
    }

    var score = 0, hitTerms = [], snippet = '', inBody = false;
    for (var k = 0; k < ws.length; k++) {
      var w = ws[k];
      var ti = page._t.indexOf(w);
      if (ti === 0) { score += 100; continue; }
      if (ti > 0) { score += 50 - Math.min(ti, 20) * 0.1; continue; }

      var found = -1;
      for (var i = 0; i < page._terms.length; i++) {
        if (page._terms[i].indexOf(w) !== -1) { found = i; break; }
      }
      if (found !== -1) {
        score += 25 - Math.min(found, 50) * 0.05;   // 上のほうの見出しほど少し高く
        if (hitTerms.indexOf(page.terms[found]) === -1) hitTerms.push(page.terms[found]);
        continue;
      }

      if (page._x.indexOf(w) !== -1) { score += 10; continue; }

      var bi = page._b.indexOf(w);
      if (bi === -1) return null;
      // 何度も出てくるページを少し上へ（数えるのは5回まで）
      var n = 1, from = bi + w.length;
      while (n < 5) {
        var nx = page._b.indexOf(w, from);
        if (nx === -1) break;
        n++; from = nx + w.length;
      }
      var pts = 6 + n;
      if (page._b.length > LONG_BODY) pts = pts / 2;
      score += pts;
      inBody = true;
      if (!snippet) snippet = cut(page.body, bi, w.length);
    }
    return { score: score, hitTerm: hitTerms[0] || '', hitTerms: hitTerms, snippet: snippet, inBody: inBody };
  }

  /** 本文から、当たった語の前後を1行の中で抜き出す */
  function cut(body, at, len) {
    var s = body.lastIndexOf('\n', at) + 1;
    var e = body.indexOf('\n', at);
    if (e === -1) e = body.length;
    var a = Math.max(s, at - 22);
    var b = Math.min(e, at + len + 34);
    return (a > s ? '…' : '') + body.slice(a, b).trim() + (b < e ? '…' : '');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** text の中で ws のどれかに当たる所を <tag class="cls"> で囲む（全角・半角の違いは無視して探す） */
  function mark(text, ws, open, close) {
    text = String(text);
    // NFKC で長さが変わる文字があるので、1文字ずつそろえた写しを作って位置を合わせる
    var low = '', map = [];
    for (var i = 0; i < text.length; i++) {
      var c = norm(text.charAt(i));
      for (var j = 0; j < c.length; j++) { low += c.charAt(j); map.push(i); }
    }
    map.push(text.length);
    var out = '', pos = 0;   // pos は low の中の位置
    while (pos < low.length) {
      var best = -1, len = 0;
      for (var k = 0; k < ws.length; k++) {
        var at = low.indexOf(ws[k], pos);
        if (at !== -1 && (best === -1 || at < best)) { best = at; len = ws[k].length; }
      }
      if (best === -1) break;
      var a = map[best], b = map[best + len - 1] + 1;
      out += esc(text.slice(map[pos], a)) + open + esc(text.slice(a, b)) + close;
      pos = best + len;
      while (pos < low.length && map[pos] < b) pos++;
    }
    return out + esc(text.slice(pos < low.length ? map[pos] : text.length));
  }

  /**
   * 開いた先で、当たった語の場所まで進んで印を付けてもらうためのURLの末尾。
   * 対応していないブラウザや、枠（iframe）の中では何も起きず、ふつうにページの先頭が開く。
   */
  function fragment(ws) {
    if (!ws.length) return '';
    return '#:~:text=' + ws.map(function (w) { return encodeURIComponent(w).replace(/-/g, '%2D'); }).join('&text=');
  }

  window.SITE_SEARCH_CORE = { norm: norm, words: words, match: match, mark: mark, esc: esc, fragment: fragment };
})();

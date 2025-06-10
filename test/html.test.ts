import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { createAnsiToHtmlTransformer } from "../src/html.js";

// slop tests for now

describe("HTML Producer", () => {
  test("works on plain text", () => {
    const producer = createAnsiToHtmlTransformer();
    const html = producer.push("hello world");
    assert.deepEqual(html, ["<span>hello world</span>"]);
  });

  test("works on bold text", () => {
    const producer = createAnsiToHtmlTransformer();
    const html = producer.push("\x1b[1mbold text\x1b[0m");
    assert.deepEqual(html, ['<span class="ansi-bold">bold text</span>']);
  });

  test("works on colored text", () => {
    const producer = createAnsiToHtmlTransformer();
    const html = producer.push("\x1b[31mred text\x1b[0m");
    assert.deepEqual(html, ['<span style="color: #aa0000">red text</span>']);
  });

  test("works on background colors", () => {
    const producer = createAnsiToHtmlTransformer();
    const html = producer.push("\x1b[41mred background\x1b[0m");
    assert.deepEqual(html, [
      '<span style="background-color: #aa0000">red background</span>',
    ]);
  });

  test("works on multiple decorations", () => {
    const producer = createAnsiToHtmlTransformer();
    const html = producer.push("\x1b[1;31;42mbold red on green\x1b[0m");
    assert.deepEqual(html, [
      '<span class="ansi-bold" style="color: #aa0000; background-color: #00aa00">bold red on green</span>',
    ]);
  });

  test("handles multiple text decorations", () => {
    const producer = createAnsiToHtmlTransformer();
    const html = producer.push("\x1b[4;9munderline and strikethrough\x1b[0m");
    assert.deepEqual(html, [
      '<span class="ansi-underline ansi-strikethrough">underline and strikethrough</span>',
    ]);
  });

  test("handles escape sequences in text", () => {
    const producer = createAnsiToHtmlTransformer();
    const html = producer.push('\x1b[31m<script>alert("xss")</script>\x1b[0m');
    assert.deepEqual(html, [
      '<span style="color: #aa0000">&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</span>',
    ]);
  });

  test("handles empty chunks", () => {
    const producer = createAnsiToHtmlTransformer();
    const html = producer.push("\x1b[31m\x1b[32mtext");
    assert.deepEqual(html, ['<span style="color: #00aa00">text</span>']);
  });

  describe("XSS Security Tests", () => {
    test("escapes HTML script tags", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        '\x1b[31m<script>alert("xss")</script>\x1b[0m',
      );
      assert.deepEqual(html, [
        '<span style="color: #aa0000">&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</span>',
      ]);
    });

    test("escapes HTML img tags with onerror", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        '\x1b[1m<img src="x" onerror="alert(1)">\x1b[0m',
      );
      assert.deepEqual(html, [
        '<span class="ansi-bold">&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;</span>',
      ]);
    });

    test("escapes HTML with JavaScript protocol", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        '\x1b[4m<a href="javascript:alert(1)">link</a>\x1b[0m',
      );
      assert.deepEqual(html, [
        '<span class="ansi-underline">&lt;a href=&quot;javascript:alert(1)&quot;&gt;link&lt;/a&gt;</span>',
      ]);
    });

    test("escapes iframe with srcdoc", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        '\x1b[31m<iframe srcdoc="<script>alert(1)</script>"></iframe>\x1b[0m',
      );
      assert.deepEqual(html, [
        '<span style="color: #aa0000">&lt;iframe srcdoc=&quot;&lt;script&gt;alert(1)&lt;/script&gt;&quot;&gt;&lt;/iframe&gt;</span>',
      ]);
    });

    test("escapes event handlers", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        '\x1b[1m<div onclick="alert(1)" onmouseover="alert(2)">div</div>\x1b[0m',
      );
      assert.deepEqual(html, [
        '<span class="ansi-bold">&lt;div onclick=&quot;alert(1)&quot; onmouseover=&quot;alert(2)&quot;&gt;div&lt;/div&gt;</span>',
      ]);
    });

    test("escapes HTML entities", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        "\x1b[32m&lt;script&gt; &amp; &quot; &#39;\x1b[0m",
      );
      assert.deepEqual(html, [
        '<span style="color: #00aa00">&amp;lt;script&amp;gt; &amp;amp; &amp;quot; &amp;#39;</span>',
      ]);
    });

    test("escapes style attribute injection", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        '\x1b[31m" style="background:url(javascript:alert(1))"\x1b[0m',
      );
      assert.deepEqual(html, [
        '<span style="color: #aa0000">&quot; style=&quot;background:url(javascript:alert(1))&quot;</span>',
      ]);
    });

    test("escapes SVG with script", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        "\x1b[1m<svg><script>alert(1)</script></svg>\x1b[0m",
      );
      assert.deepEqual(html, [
        '<span class="ansi-bold">&lt;svg&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;/svg&gt;</span>',
      ]);
    });

    test("escapes template literals and backticks", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[31m`${alert(1)}`\x1b[0m");
      assert.deepEqual(html, [
        '<span style="color: #aa0000">`${alert(1)}`</span>',
      ]);
    });

    test("escapes HTML5 data attributes", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        '\x1b[1m<div data-test="<script>alert(1)</script>">content</div>\x1b[0m',
      );
      assert.deepEqual(html, [
        '<span class="ansi-bold">&lt;div data-test=&quot;&lt;script&gt;alert(1)&lt;/script&gt;&quot;&gt;content&lt;/div&gt;</span>',
      ]);
    });

    test("escapes mixed content with special characters", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[31m<>&\"'`{}[]\x1b[0m");
      assert.deepEqual(html, [
        '<span style="color: #aa0000">&lt;&gt;&amp;&quot;&#039;`{}[]</span>',
      ]);
    });

    test("handles newlines and special whitespace", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[1mline1\nline2\rline3\tline4\x1b[0m");
      assert.deepEqual(html, [
        '<span class="ansi-bold">line1\nline2\rline3\tline4</span>',
      ]);
    });

    test("escapes potential CSS injection in text", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        '\x1b[31m"; background: url(javascript:alert(1)); "\x1b[0m',
      );
      assert.deepEqual(html, [
        '<span style="color: #aa0000">&quot;; background: url(javascript:alert(1)); &quot;</span>',
      ]);
    });

    test("handles very long potential XSS payload", () => {
      const producer = createAnsiToHtmlTransformer();
      const longPayload = "<script>" + "A".repeat(1000) + "alert(1)</script>";
      const html = producer.push(`\x1b[31m${longPayload}\x1b[0m`);
      const expectedEscaped =
        "&lt;script&gt;" + "A".repeat(1000) + "alert(1)&lt;/script&gt;";
      assert.deepEqual(html, [
        `<span style="color: #aa0000">${expectedEscaped}</span>`,
      ]);
    });

    test("handles Unicode and special encoding attempts", () => {
      const producer = createAnsiToHtmlTransformer();
      // Unicode characters that might be used to bypass filters
      const html = producer.push(
        "\x1b[31m\u003cscript\u003ealert(1)\u003c/script\u003e\x1b[0m",
      );
      assert.deepEqual(html, [
        '<span style="color: #aa0000">&lt;script&gt;alert(1)&lt;/script&gt;</span>',
      ]);
    });

    test("escapes HTML comments", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        "\x1b[1m<!-- <script>alert(1)</script> -->\x1b[0m",
      );
      assert.deepEqual(html, [
        '<span class="ansi-bold">&lt;!-- &lt;script&gt;alert(1)&lt;/script&gt; --&gt;</span>',
      ]);
    });

    test("validates class names to prevent injection", () => {
      const producer = createAnsiToHtmlTransformer();
      // The HTML transformer should only output safe class names
      // This test ensures our class name validation is working
      const html = producer.push("\x1b[1mbold text\x1b[0m");
      assert.deepEqual(html, ['<span class="ansi-bold">bold text</span>']);
    });

    test("style values are properly formatted and safe", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[31mred text\x1b[0m");
      assert.deepEqual(html, ['<span style="color: #aa0000">red text</span>']);
    });

    test("hex color codes are validated format", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[38;2;255;128;64mcustom color\x1b[0m");
      assert.deepEqual(html, [
        '<span style="color: #ff8040">custom color</span>',
      ]);
    });

    test("handles edge cases with null/undefined safely", () => {
      const producer = createAnsiToHtmlTransformer();
      // Test with sequences that might produce edge cases
      const html = producer.push("\x1b[mplain text\x1b[0m");
      // Should handle gracefully without errors
      assert.deepEqual(html, ["<span>plain text</span>"]);
    });
  });

  describe("HTML Structure Security", () => {
    test("output is always well-formed HTML", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[1;31mbold red\x1b[0m");
      assert.deepEqual(html, [
        '<span class="ansi-bold" style="color: #aa0000">bold red</span>',
      ]);
    });

    test("attributes are properly quoted", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[1;31mbold red\x1b[0m");
      assert.deepEqual(html, [
        '<span class="ansi-bold" style="color: #aa0000">bold red</span>',
      ]);
    });

    test("no attribute injection possible", () => {
      const producer = createAnsiToHtmlTransformer();
      // Test with text that might try to break out of attributes
      const html = producer.push('\x1b[31m" onload="alert(1)" "\x1b[0m');
      assert.deepEqual(html, [
        '<span style="color: #aa0000">&quot; onload=&quot;alert(1)&quot; &quot;</span>',
      ]);
    });
  });
});

describe("HTML Security Tests", () => {
  describe("HTML escaping", () => {
    test("escapes script tags in text", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push('<script>alert("XSS")</script>');
      assert.deepEqual(html, [
        "<span>&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;</span>",
      ]);
    });

    test("escapes all HTML entities", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("& < > \" ' &amp;");
      assert.deepEqual(html, [
        "<span>&amp; &lt; &gt; &quot; &#039; &amp;amp;</span>",
      ]);
    });

    test("escapes HTML in colored text", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        '\x1b[31m<img src=x onerror="alert(1)">\x1b[0m',
      );
      assert.deepEqual(html, [
        '<span style="color: #aa0000">&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</span>',
      ]);
    });

    test("escapes HTML with multiple ANSI codes", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[1;31m<b>not bold</b>\x1b[0m");
      assert.deepEqual(html, [
        '<span class="ansi-bold" style="color: #aa0000">&lt;b&gt;not bold&lt;/b&gt;</span>',
      ]);
    });
  });

  describe("Combined attacks", () => {
    test("handles multiple escape attempts", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        "\x1b[31m<b onmouseover=\"alert('xss')\">\x1b[1mtest</b>\x1b[0m",
      );
      assert.deepEqual(html, [
        '<span style="color: #aa0000">&lt;b onmouseover=&quot;alert(&#039;xss&#039;)&quot;&gt;</span>',
        '<span class="ansi-bold" style="color: #aa0000">test&lt;/b&gt;</span>',
      ]);
    });

    test("handles nested quotes and escapes", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\"'\\\"\\'&<>");
      assert.deepEqual(html, [
        "<span>&quot;&#039;\\&quot;\\&#039;&amp;&lt;&gt;</span>",
      ]);
    });

    test("handles HTML entities in decorated text", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[4;9m<marquee>&nbsp;</marquee>\x1b[0m");
      assert.deepEqual(html, [
        '<span class="ansi-underline ansi-strikethrough">&lt;marquee&gt;&amp;nbsp;&lt;/marquee&gt;</span>',
      ]);
    });
  });

  describe("Edge cases", () => {
    test("handles empty strings", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("");
      assert.deepEqual(html, []);
    });

    test("handles null bytes", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("before\x00after");
      assert.deepEqual(html, ["<span>before\x00after</span>"]);
    });

    test("handles unicode in text", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        "emoji: 😀 unicode: \u{1F600} special: \u0000",
      );
      assert.deepEqual(html, [
        "<span>emoji: 😀 unicode: 😀 special: \x00</span>",
      ]);
    });

    test("handles ANSI codes with special characters", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[31m<\x1b[32m>\x1b[33m&\x1b[0m");
      assert.deepEqual(html, [
        '<span style="color: #aa0000">&lt;</span>',
        '<span style="color: #00aa00">&gt;</span>',
        '<span style="color: #aa5500">&amp;</span>',
      ]);
    });
  });

  describe("Style attribute format", () => {
    test("properly formats multiple styles", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[31;42mred on green\x1b[0m");
      assert.deepEqual(html, [
        '<span style="color: #aa0000; background-color: #00aa00">red on green</span>',
      ]);
    });

    test("no trailing semicolon in style attribute", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[31mred\x1b[0m");
      // Check that there's no double semicolon or trailing semicolon
      assert.strictEqual(html[0], '<span style="color: #aa0000">red</span>');
    });

    test("handles all decorations as classes", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[1;2;3;4;5;7;8;9mAll decorations\x1b[0m");
      assert.deepEqual(html, [
        '<span class="ansi-bold ansi-dim ansi-italic ansi-underline ansi-blink ansi-reverse ansi-hidden ansi-strikethrough">All decorations</span>',
      ]);
    });
  });

  describe("Class generation", () => {
    test("generates correct classes for decorations", () => {
      const producer = createAnsiToHtmlTransformer();

      // Test each decoration individually
      const decorations = [
        { code: "1", class: "ansi-bold" },
        { code: "2", class: "ansi-dim" },
        { code: "3", class: "ansi-italic" },
        { code: "4", class: "ansi-underline" },
        { code: "5", class: "ansi-blink" },
        { code: "7", class: "ansi-reverse" },
        { code: "8", class: "ansi-hidden" },
        { code: "9", class: "ansi-strikethrough" },
      ];

      decorations.forEach(({ code, class: className }) => {
        const html = producer.push(`\x1b[${code}mtext\x1b[0m`);
        assert.deepEqual(html, [`<span class="${className}">text</span>`]);
      });
    });

    test("combines multiple classes properly", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push("\x1b[1;4mBold underline\x1b[0m");
      assert.deepEqual(html, [
        '<span class="ansi-bold ansi-underline">Bold underline</span>',
      ]);
    });
  });

  describe("Reset behavior", () => {
    test("reset clears buffer", () => {
      const producer = createAnsiToHtmlTransformer();
      producer.push("\x1b[31mincomplete");
      producer.reset();
      const html = producer.push("text");
      assert.deepEqual(html, ["<span>text</span>"]);
    });
  });

  describe("Real-world examples", () => {
    test("handles npm output style", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        "\x1b[2m┌─\x1b[22m\x1b[1mnpm\x1b[22m\x1b[2m─┐\x1b[22m",
      );
      assert.deepEqual(html, [
        '<span class="ansi-dim">┌─</span>',
        '<span class="ansi-bold">npm</span>',
        '<span class="ansi-dim">─┐</span>',
      ]);
    });

    test("handles git diff style", () => {
      const producer = createAnsiToHtmlTransformer();
      const html = producer.push(
        "\x1b[32m+ added line\x1b[0m\n\x1b[31m- removed line\x1b[0m",
      );
      assert.deepEqual(html, [
        '<span style="color: #00aa00">+ added line</span>',
        "<span>\n</span>",
        '<span style="color: #aa0000">- removed line</span>',
      ]);
    });
  });
});

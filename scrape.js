const { chromium } = require("playwright");

const seeds = Array.from({ length: 10 }, (_, i) => 15 + i);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let floatMode = false;
  let grandBig = 0n;
  let grandFloat = 0;

  for (const seed of seeds) {
    const url = `https://sanand0.github.io/tdsdata/js_table/?seed=${seed}`;

    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Wait until at least some table cells exist (JS-rendered content)
    await page.waitForFunction(
      () => document.querySelectorAll("table td, table th").length > 0,
      null,
      { timeout: 30000 }
    );

    // Small buffer for late rendering
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll("table td, table th"));
      const numRe = /-?\d+(?:\.\d+)?/g;

      let sumBig = 0n;
      let sumFloat = 0;
      let isFloat = false;

      for (const cell of cells) {
        const txt = (cell.innerText || "").replace(/,/g, ""); // handle 1,234
        const matches = txt.match(numRe);
        if (!matches) continue;

        for (const m of matches) {
          if (m.includes(".")) {
            isFloat = true;
            sumFloat += Number(m);
          } else if (!isFloat) {
            sumBig += BigInt(m);
          } else {
            sumFloat += Number(m);
          }
        }
      }

      return {
        isFloat,
        sum: isFloat ? sumFloat : sumBig.toString(),
        cellCount: cells.length
      };
    });

    console.log(`seed=${seed} cells=${result.cellCount} sum=${result.sum}`);

    if (result.isFloat) {
      floatMode = true;
      grandFloat += Number(result.sum);
    } else if (!floatMode) {
      grandBig += BigInt(result.sum);
    } else {
      // If we ever switched to floatMode, we have to continue in Number space.
      // (This should not happen for integer-only tables.)
      grandFloat += Number(result.sum);
    }
  }

  await browser.close();

  const grand = floatMode ? String(grandFloat) : grandBig.toString();

  console.log(`Grand total across seeds 15-24: ${grand}`);
  console.log(grand); // IMPORTANT: number alone (easy for autograder to find)
})();

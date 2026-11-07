// Run in the local gallery tab after the page loads. The gallery is generated
// from catalog/index.json and the previews are the committed PNG outputs.
async () => {
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const chooseZone = (zone) => [...document.querySelectorAll(".filter")].find((button) => button.dataset.group === zone)?.click();
  const chooseAsset = (id) => document.querySelector(`.tile[data-id="${id}"]`)?.click();
  const trace = [];

  await pause(1200);
  chooseZone("attractions and queues");
  await pause(900);
  chooseAsset("park-observation-wheel");
  await pause(1400);
  trace.push({ stage: "default observation wheel", details: document.getElementById("meta").innerText });
  document.getElementById("scaleVariant").click();
  await pause(1900);
  trace.push({ stage: "scale 1.25 mesh", details: document.getElementById("meta").innerText });
  chooseZone("midway games");
  await pause(700);
  chooseAsset("ring-toss-game-counter");
  await pause(1300);
  trace.push({ stage: "midway game", title: document.getElementById("title").textContent });
  chooseZone("concessions and rest areas");
  await pause(700);
  chooseAsset("cotton-candy-cart");
  await pause(1500);
  trace.push({ stage: "concession cart", title: document.getElementById("title").textContent });
  chooseZone("All zones");
  return {
    trace,
    selectedAtEnd: document.getElementById("title").textContent,
    visibleAssetCards: [...document.querySelectorAll(".tile")].filter((node) => !node.hidden).length,
  };
}

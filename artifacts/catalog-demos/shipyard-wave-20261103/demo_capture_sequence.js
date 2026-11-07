// Run in the local shipyard gallery tab after the page loads.
async () => {
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const chooseZone = (zone) => [...document.querySelectorAll(".filter")].find((button) => button.dataset.group === zone)?.click();
  const chooseAsset = (id) => document.querySelector(`.tile[data-id="${id}"]`)?.click();
  const trace = [];

  await pause(1200);
  chooseZone("Plate and block fabrication");
  await pause(900);
  chooseAsset("hull-block-fabrication-jig");
  await pause(1300);
  trace.push({ stage: "block fabrication jig", asset: document.getElementById("title").textContent });
  chooseZone("Block and material movement");
  await pause(800);
  chooseAsset("shipyard-block-transporter");
  await pause(1300);
  trace.push({ stage: "default block transporter", details: document.getElementById("meta").innerText });
  document.getElementById("scaleVariant").click();
  await pause(1800);
  trace.push({ stage: "generated scale-1.2 transporter mesh", details: document.getElementById("meta").innerText });
  chooseZone("Surface preparation and coating");
  await pause(800);
  chooseAsset("hull-block-paint-booth");
  await pause(1300);
  trace.push({ stage: "coating zone", asset: document.getElementById("title").textContent });
  chooseZone("Yard and dock operations");
  await pause(700);
  chooseAsset("floating-drydock-pontoon-module");
  await pause(1500);
  trace.push({ stage: "dock operations", asset: document.getElementById("title").textContent });
  chooseZone("All zones");
  return {
    trace,
    selectedAtEnd: document.getElementById("title").textContent,
    visibleAssetCards: [...document.querySelectorAll(".tile")].filter((node) => !node.hidden).length,
  };
}

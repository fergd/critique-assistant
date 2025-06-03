figma.showUI(__html__, { width: 500, height: 700 });

function serializeNode(node, depth = 0) {
  if (depth > 4) return null;
  return {
    nodeId: node.id,
    name: node.name,
    type: node.type,
    characters: node.type === "TEXT" ? node.characters : undefined,
    visible: node.visible,
    layoutMode: node.layoutMode,
    itemSpacing: node.itemSpacing,
    children: "children" in node
      ? node.children.map(child => serializeNode(child, depth + 1)).filter(Boolean)
      : []
  };
}

figma.ui.onmessage = (msg) => {
  if (msg.type === "trigger-analysis") {
    const selection = figma.currentPage.selection;
    const frames = selection.filter(n => n.type === "FRAME");
    if (frames.length === 0) {
      figma.notify("Please select one or more frames to analyze.");
      return;
    }

    const payload = frames.map(f => serializeNode(f));
    figma.ui.postMessage({ type: "design-data", payload });
  }

  if (msg.type === "highlight") {
    const node = figma.getNodeById(msg.nodeId);
    if (node) {
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
    } else {
      figma.notify("Node not found");
    }
  }
};

figma.showUI(__html__, { width: 500, height: 700 });

function serializeNode(node, depth = 0) {
  if (depth > 4 || !node.visible) return null;
  return {
  nodeId: node.id,
  name: node.name,
  type: node.type,
  characters: node.type === "TEXT" ? node.characters : undefined,
  textKey: node.type === "TEXT" && typeof node.characters === "string"
    ? node.characters.trim().toLowerCase()
    : undefined,
  visible: node.visible,
  layoutMode: node.layoutMode,
  itemSpacing: node.itemSpacing,
  width: "width" in node ? node.width : undefined,
  height: "height" in node ? node.height : undefined,
  children: "children" in node
    ? node.children.map(child => serializeNode(child, depth + 1)).filter(Boolean)
    : []
};

}

figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === "trigger-analysis") {
      const selection = figma.currentPage.selection;
      const elements = selection.filter(n =>
        ["FRAME", "GROUP", "SECTION"].includes(n.type)
      );

      if (elements.length === 0) {
        figma.notify("Please select one or more frames, groups, or sections to analyze.");
        figma.ui.postMessage({ type: "error", reason: "no-valid-selection" });
        return;
      }

      const payload = elements.map(el => serializeNode(el)).filter(Boolean);
      figma.ui.postMessage({ type: "design-data", payload });
    }

    if (msg.type === "highlight") {
      const node = figma.getNodeById(msg.nodeId);
      if (!node) {
        figma.notify("Node not found.");
        return;
      }

      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);

      const isContainer = ["FRAME", "GROUP", "SECTION", "COMPONENT", "INSTANCE"].includes(node.type);

      if (isContainer && "strokes" in node && "strokeWeight" in node && "dashPattern" in node) {
        const originalStrokes = node.strokes;
        const originalWeight = node.strokeWeight;
        const originalAlign = node.strokeAlign;
        const originalDash = node.dashPattern;

        node.strokes = [{ type: "SOLID", color: { r: 0.5, g: 0, b: 0.5 } }];
        node.strokeWeight = 3;
        node.strokeAlign = "CENTER";
        node.dashPattern = [4, 2];

        setTimeout(() => {
          try {
            node.strokes = originalStrokes;
            node.strokeWeight = originalWeight;
            node.strokeAlign = originalAlign;
            node.dashPattern = originalDash;
          } catch (e) {
            console.warn("Failed to restore original stroke:", e);
          }
        }, 3000);
      }
    }
  } catch (err) {
    console.error("❌ Error in plugin message handler:", err);
    figma.notify("Unexpected error occurred. See console for details.");
  }
};

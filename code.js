figma.showUI(__html__, { width: 580, height: 800 });

console.log('MAIN CODE - Plugin started, UI shown');

function serializeNode(node, depth) {
  if (depth === undefined) depth = 0;
  if (depth > 8) return null;
  // Don't filter out invisible nodes completely - they might contain important context
  // if (!node.visible) return null;
  
  var serialized = {
    nodeId: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
    width: node.hasOwnProperty("width") ? node.width : undefined,
    height: node.hasOwnProperty("height") ? node.height : undefined
  };
  
  // Add text-specific properties
  if (node.type === "TEXT") {
    serialized.characters = node.characters;
    serialized.textKey = typeof node.characters === "string" ? node.characters.trim().toLowerCase() : undefined;
    serialized.fontSize = node.hasOwnProperty("fontSize") ? node.fontSize : undefined;
    serialized.fontName = node.hasOwnProperty("fontName") ? node.fontName : undefined;
    serialized.textAlignHorizontal = node.hasOwnProperty("textAlignHorizontal") ? node.textAlignHorizontal : undefined;
  }
  
  // Add layout properties for containers
  if (node.hasOwnProperty("layoutMode")) {
    serialized.layoutMode = node.layoutMode;
    serialized.itemSpacing = node.hasOwnProperty("itemSpacing") ? node.itemSpacing : undefined;
    serialized.paddingTop = node.hasOwnProperty("paddingTop") ? node.paddingTop : undefined;
    serialized.paddingBottom = node.hasOwnProperty("paddingBottom") ? node.paddingBottom : undefined;
    serialized.paddingLeft = node.hasOwnProperty("paddingLeft") ? node.paddingLeft : undefined;
    serialized.paddingRight = node.hasOwnProperty("paddingRight") ? node.paddingRight : undefined;
  }
  
  // Add fill and stroke information
  if (node.hasOwnProperty("fills")) {
    serialized.fills = node.fills;
  }
  if (node.hasOwnProperty("strokes")) {
    serialized.strokes = node.strokes;
  }
  
  // Add children recursively - use "in" operator like original app
  if ("children" in node && node.children && node.children.length > 0) {
    console.log('MAIN CODE - Serializing ' + node.children.length + ' children for node "' + node.name + '"');
    serialized.children = [];
    for (var i = 0; i < node.children.length; i++) {
      var child = node.children[i];
      var serializedChild = serializeNode(child, depth + 1);
      if (serializedChild) {
        serialized.children.push(serializedChild);
      } else {
        console.log('MAIN CODE - Child "' + child.name + '" was filtered out (depth: ' + (depth + 1) + ')');
      }
    }
    console.log('MAIN CODE - Final children count for "' + node.name + '": ' + serialized.children.length);
  } else {
    serialized.children = [];
    if ("children" in node) {
      console.log('MAIN CODE - Node "' + node.name + '" has empty or no children array');
    } else {
      console.log('MAIN CODE - Node "' + node.name + '" has NO children property at all');
    }
  }
  
  return serialized;
}

// Store current selection
var currentSelection = [];
var selectedFrames = [];

// Listen for selection changes
figma.on('selectionchange', function() {
  console.log('MAIN CODE - FIGMA SELECTION CHANGED EVENT FIRED');
  console.log('MAIN CODE - Raw figma.selection:', figma.selection);
  
  // Handle the case where figma.selection is undefined
  if (figma.selection === undefined || figma.selection === null) {
    console.log('MAIN CODE - figma.selection is undefined/null, using currentPage.selection');
    currentSelection = figma.currentPage.selection || [];
  } else {
    currentSelection = figma.selection;
  }
  
  console.log('MAIN CODE - currentSelection after assignment:', currentSelection);
  updateFrameSelection();
});

// Update frame selection and notify UI
function updateFrameSelection() {
  console.log('MAIN CODE - updateFrameSelection() called');
  
  // Ensure currentSelection is an array
  if (!currentSelection || !Array.isArray(currentSelection)) {
    console.log('MAIN CODE - currentSelection was invalid, setting to empty array');
    currentSelection = [];
  }
  
  console.log('MAIN CODE - Filtering selection for valid types...');
  console.log('MAIN CODE - Raw currentSelection length:', currentSelection.length);
  console.log('MAIN CODE - Raw currentSelection types:', currentSelection.map(function(n) { return n ? n.type : 'null'; }));
  
  selectedFrames = currentSelection.filter(function(node) {
    if (!node) {
      console.log('MAIN CODE - Found null/undefined node, skipping');
      return false;
    }
    var isValidType = ['FRAME', 'GROUP', 'SECTION'].includes(node.type);
    console.log('MAIN CODE - Node "' + node.name + '" (' + node.type + '): ' + (isValidType ? 'VALID' : 'INVALID'));
    
    // Additional debug info for each valid node
    if (isValidType) {
      console.log('MAIN CODE - Valid node "' + node.name + '" has children property (hasOwnProperty):', node.hasOwnProperty("children"));
      console.log('MAIN CODE - Valid node "' + node.name + '" has children property ("in" operator):', "children" in node);
      console.log('MAIN CODE - Valid node "' + node.name + '" children value:', node.children);
      if ("children" in node) {
        console.log('MAIN CODE - Valid node "' + node.name + '" children count:', node.children ? node.children.length : 'null');
      }
    }
    
    return isValidType;
  });
  
  console.log('MAIN CODE - Found ' + selectedFrames.length + ' valid frames/groups/sections');
  
  var message = {
    type: 'selection-changed',
    frames: selectedFrames.map(function(frame) {
      return {
        id: frame.id,
        name: frame.name,
        width: frame.hasOwnProperty('width') ? frame.width : undefined,
        height: frame.hasOwnProperty('height') ? frame.height : undefined,
        type: frame.type
      };
    })
  };
  
  console.log('MAIN CODE - Sending message to UI:', message);
  
  // Send selection update to UI immediately
  figma.ui.postMessage(message);
  
  console.log('MAIN CODE - Message sent to UI');
}

figma.ui.onmessage = async function(msg) {
  console.log('MAIN CODE - Received message from UI:', msg);
  try {
    switch (msg.type) {
      case 'get-initial-state':
        console.log('MAIN CODE - Handling get-initial-state request');
        // Send initial selection state
        updateFrameSelection();
        console.log('MAIN CODE - Sent initial state to UI');
        break;
      
      case 'focus-selected-frames':
        console.log('MAIN CODE - Handling focus-selected-frames request');
        // Focus on the currently selected frames
        if (selectedFrames.length > 0) {
          // Set selection to the frames and zoom to fit
          figma.currentPage.selection = selectedFrames;
          figma.viewport.scrollAndZoomIntoView(selectedFrames);
          
          figma.notify('Focused on ' + selectedFrames.length + ' selected frame(s)');
          console.log('MAIN CODE - Focused on ' + selectedFrames.length + ' frames');
        } else {
          figma.notify('No frames currently selected to focus on');
          console.log('MAIN CODE - No frames to focus on');
        }
        break;
      
      case 'analyze-frames':
        console.log('MAIN CODE - Starting frame analysis');
        console.log('MAIN CODE - Selected frames count:', selectedFrames.length);
        console.log('MAIN CODE - Context:', msg.context);
        console.log('MAIN CODE - Ignore repeated text:', msg.ignoreRepeatedText);
        
        if (selectedFrames.length === 0) {
          console.log('MAIN CODE - No frames selected, showing error');
          figma.notify("Please select one or more frames, groups, or sections to analyze.");
          figma.ui.postMessage({ 
            type: 'analysis-error', 
            error: 'No frames selected. Please select one or more frames to analyze.' 
          });
          return;
        }

        // Show loading state
        console.log('MAIN CODE - Sending analysis-started message to UI');
        figma.ui.postMessage({ type: 'analysis-started' });

        try {
          console.log('MAIN CODE - Serializing frames...');
          console.log('MAIN CODE - Starting serialization for ' + selectedFrames.length + ' selected frames');
          
          // Log frame details before serialization
          for (var i = 0; i < selectedFrames.length; i++) {
            var frame = selectedFrames[i];
            console.log('MAIN CODE - Frame[' + i + ']: "' + frame.name + '" (type: ' + frame.type + ')');
            console.log('MAIN CODE - Frame[' + i + '] has children property (hasOwnProperty):', frame.hasOwnProperty("children"));
            console.log('MAIN CODE - Frame[' + i + '] has children property ("in" operator):', "children" in frame);
            console.log('MAIN CODE - Frame[' + i + '] children direct access:', frame.children);
            console.log('MAIN CODE - Frame[' + i + '] children length:', frame.children ? frame.children.length : 'no children property');
            
            // Try to access children differently
            try {
              if (frame.children && frame.children.length > 0) {
                console.log('MAIN CODE - Frame[' + i + '] first child name:', frame.children[0].name);
                console.log('MAIN CODE - Frame[' + i + '] first child type:', frame.children[0].type);
              }
            } catch (childError) {
              console.log('MAIN CODE - Error accessing children:', childError);
            }
            
            // Log other frame properties to understand structure
            console.log('MAIN CODE - Frame[' + i + '] properties:', Object.keys(frame));
            console.log('MAIN CODE - Frame[' + i + '] width:', frame.width);
            console.log('MAIN CODE - Frame[' + i + '] height:', frame.height);
            console.log('MAIN CODE - Frame[' + i + '] visible:', frame.visible);
          }
          
          // Serialize the selected frames using enhanced serialization
          var payload = selectedFrames.map(function(el) { return serializeNode(el); }).filter(function(item) { return Boolean(item); });
          console.log('MAIN CODE - Serialized payload length:', payload.length);
          console.log('MAIN CODE - Serialized payload (detailed):', JSON.stringify(payload, null, 2));
          
          // Count total nodes and text nodes for validation
          var totalNodes = 0;
          var textNodes = 0;
          function countNodes(node) {
            if (node) {
              totalNodes++;
              if (node.type === 'TEXT') textNodes++;
              if (node.children) {
                node.children.forEach(countNodes);
              }
            }
          }
          payload.forEach(countNodes);
          console.log('MAIN CODE - Total nodes in payload:', totalNodes);
          console.log('MAIN CODE - Text nodes in payload:', textNodes);

          // Send to the proxy service
          var proxyUrl = 'https://critique-assistant-proxy-g5dvt2noj-christans-projects-b1d924ef.vercel.app/api/proxy';
          console.log('MAIN CODE - Sending to proxy URL:', proxyUrl);
          
          var requestBody = {
            design: payload,
            context: msg.context || '',
            ignoreRepeated: msg.ignoreRepeatedText || false
          };
          console.log('MAIN CODE - Request body:', requestBody);
          
          var response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          console.log('MAIN CODE - Proxy response status:', response.status);
          console.log('MAIN CODE - Proxy response ok:', response.ok);

          if (!response.ok) {
            throw new Error('Proxy request failed: ' + response.status + ' ' + response.statusText);
          }

          var result = await response.json();
          console.log('MAIN CODE - Proxy response data:', result);
          console.log('MAIN CODE - Proxy response content type:', typeof result.content);
          console.log('MAIN CODE - Proxy response content:', result.content);

          console.log('MAIN CODE - Processing result from assistant...');
          // Process the result from the assistant
          var analysisResult;
          
          if (result.error) {
            console.log('MAIN CODE - Result contains error:', result.error);
            throw new Error(result.error);
          }
          
          console.log('MAIN CODE - Result type:', typeof result);
          console.log('MAIN CODE - Result structure check...');
          
          // The proxy returns { content: "..." } where content is the assistant's response
          var assistantContent = result.content || result;
          console.log('MAIN CODE - Assistant content:', assistantContent);
          console.log('MAIN CODE - Assistant content type:', typeof assistantContent);
          
          // Check if content is empty or just "[]"
          if (!assistantContent || assistantContent === '[]' || assistantContent.trim() === '[]') {
            console.log('MAIN CODE - Assistant returned empty content, this indicates insufficient data was sent');
            analysisResult = {
              summary: "No issues detected - may need more detailed design content",
              strengths: [],
              improvements: [],
              accessibility: [],
              recommendations: [],
              rawFeedback: assistantContent,
              debugNote: "Assistant returned empty array - check if frame contains sufficient design elements"
            };
          } else {
            // Try to parse the assistant's content as JSON first
            if (typeof assistantContent === 'string') {
              console.log('MAIN CODE - Attempting to parse assistant content as JSON');
              try {
                var parsedContent = JSON.parse(assistantContent);
                console.log('MAIN CODE - Successfully parsed assistant content:', parsedContent);
                
                // Use the parsed content directly if it's an array (list of violations)
                if (Array.isArray(parsedContent)) {
                  analysisResult = {
                    summary: "Analysis found " + parsedContent.length + " issues",
                    strengths: [],
                    improvements: parsedContent,
                    accessibility: [],
                    recommendations: [],
                    rawFeedback: assistantContent
                  };
                } else {
                  // Use parsed object structure
                  analysisResult = {
                    summary: parsedContent.summary || "Analysis completed",
                    strengths: Array.isArray(parsedContent.strengths) ? parsedContent.strengths : [],
                    improvements: Array.isArray(parsedContent.improvements) ? parsedContent.improvements : [],
                    accessibility: Array.isArray(parsedContent.accessibility) ? parsedContent.accessibility : [],
                    recommendations: Array.isArray(parsedContent.recommendations) ? parsedContent.recommendations : [],
                    rawFeedback: assistantContent
                  };
                }
              } catch (parseError) {
                console.log('MAIN CODE - JSON parse failed, treating as raw text:', parseError);
                // If parsing fails, treat as raw text feedback
                analysisResult = {
                  summary: "AI provided feedback in text format",
                  strengths: [],
                  improvements: [{
                    title: "AI Analysis",
                    description: assistantContent,
                    severity: "info"
                  }],
                  accessibility: [],
                  recommendations: [],
                  rawFeedback: assistantContent
                };
              }
            } else {
              console.log('MAIN CODE - Assistant content is not string, using as object');
              analysisResult = {
                summary: assistantContent.summary || "Analysis completed",
                strengths: Array.isArray(assistantContent.strengths) ? assistantContent.strengths : [],
                improvements: Array.isArray(assistantContent.improvements) ? assistantContent.improvements : [],
                accessibility: Array.isArray(assistantContent.accessibility) ? assistantContent.accessibility : [],
                recommendations: Array.isArray(assistantContent.recommendations) ? assistantContent.recommendations : [],
                rawFeedback: JSON.stringify(assistantContent)
              };
            }
          }
          
          console.log('MAIN CODE - Final analysisResult:', analysisResult);

          figma.ui.postMessage({
            type: 'analysis-complete',
            result: analysisResult
          });

        } catch (apiError) {
          console.error('MAIN CODE - API Error:', apiError);
          
          var errorMessage = 'Failed to get AI analysis. Please try again.';
          
          if (apiError.message && (apiError.message.includes('504') || apiError.message.includes('Gateway Timeout'))) {
            errorMessage = 'Server timeout: The analysis service is currently experiencing delays. Please try again in a few minutes.';
          } else if (apiError.message && (apiError.message.includes('503') || apiError.message.includes('Service Unavailable'))) {
            errorMessage = 'Service temporarily unavailable: The AI analysis service is under maintenance. Please try again later.';
          } else if (apiError.message && apiError.message.includes('fetch')) {
            errorMessage = 'Network error: Unable to connect to the analysis service. Please check your internet connection and try again.';
          }
          
          figma.ui.postMessage({
            type: 'analysis-error',
            error: errorMessage
          });
        }
        break;

      case 'highlight':
        // Node highlighting functionality from original app
        var node = await figma.getNodeByIdAsync(msg.nodeId);
        if (!node) {
          figma.notify("Node not found.");
          return;
        }

        figma.currentPage.selection = [node];
        figma.viewport.scrollAndZoomIntoView([node]);

        var isContainer = ["FRAME", "GROUP", "SECTION", "COMPONENT", "INSTANCE"].includes(node.type);

        if (isContainer && node.hasOwnProperty("strokes") && node.hasOwnProperty("strokeWeight") && node.hasOwnProperty("dashPattern")) {
          var originalStrokes = node.strokes;
          var originalWeight = node.strokeWeight;
          var originalAlign = node.strokeAlign;
          var originalDash = node.dashPattern;

          node.strokes = [{ type: "SOLID", color: { r: 0.5, g: 0, b: 0.5 } }];
          node.strokeWeight = 3;
          node.strokeAlign = "CENTER";
          node.dashPattern = [4, 2];

          setTimeout(function() {
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
        break;
      
      case 'show-notification':
        figma.notify(msg.message, { timeout: msg.timeout || 3000 });
        break;
      
      case 'close-plugin':
        figma.closePlugin();
        break;

      case 'focus-violation-area':
        // Enhanced focusing for specific violation areas
        console.log('MAIN CODE - Focus violation area request received:', msg.violationContext);
        var currentSelection = figma.currentPage.selection;
        
        if (currentSelection && currentSelection.length > 0) {
          var targetFrame = currentSelection[0];
          var nodesFound = [];
          
          // Function to recursively search for relevant nodes based on violation context
          function findRelevantNodes(node, context) {
            var relevantNodes = [];
            
            // Check if this node matches violation context
            if (node.name && context.title) {
              var titleLower = context.title.toLowerCase();
              var nameLower = node.name.toLowerCase();
              
              // Look for nodes that match violation keywords
              if (titleLower.includes('color') || titleLower.includes('contrast')) {
                if (node.type === 'TEXT' || (node.fills && node.fills.length > 0)) {
                  relevantNodes.push(node);
                }
              } else if (titleLower.includes('spacing') || titleLower.includes('padding') || titleLower.includes('margin')) {
                if (node.type === 'FRAME' || node.type === 'GROUP') {
                  relevantNodes.push(node);
                }
              } else if (titleLower.includes('text') || titleLower.includes('font') || titleLower.includes('typography')) {
                if (node.type === 'TEXT') {
                  relevantNodes.push(node);
                }
              } else if (titleLower.includes('button') || titleLower.includes('component')) {
                if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
                  relevantNodes.push(node);
                }
              } else {
                // General case - look for smaller, more specific nodes
                if (node.type === 'TEXT' || node.type === 'INSTANCE') {
                  relevantNodes.push(node);
                }
              }
            }
            
            // Recursively search children if available
            if (node.children) {
              for (var i = 0; i < node.children.length; i++) {
                relevantNodes = relevantNodes.concat(findRelevantNodes(node.children[i], context));
              }
            }
            
            return relevantNodes;
          }
          
          // Find specific nodes that match the violation context
          nodesFound = findRelevantNodes(targetFrame, msg.violationContext);
          
          if (nodesFound.length > 0) {
            console.log('MAIN CODE - Found', nodesFound.length, 'relevant nodes for violation');
            
            // Focus on the most specific nodes (prefer smaller, more targeted elements)
            var targetNodes = nodesFound.slice(0, 3); // Focus on first 3 relevant nodes
            figma.currentPage.selection = targetNodes;
            figma.viewport.scrollAndZoomIntoView(targetNodes);
            
            // Highlight the target nodes
            targetNodes.forEach(function(node, index) {
              if (node.hasOwnProperty && node.hasOwnProperty('strokes')) {
                var originalStrokes = node.strokes;
                var originalWeight = node.strokeWeight;
                var originalAlign = node.strokeAlign;
                var originalDash = node.dashPattern;
                
                node.strokes = [{ type: 'SOLID', color: { r: 1, g: 0.2, b: 0.2 } }];
                node.strokeWeight = 3;
                node.strokeAlign = 'CENTER';
                node.dashPattern = [4, 2];
                
                setTimeout(function() {
                  try {
                    node.strokes = originalStrokes;
                    node.strokeWeight = originalWeight;
                    node.strokeAlign = originalAlign;
                    node.dashPattern = originalDash;
                  } catch (e) {
                    console.warn('MAIN CODE - Failed to restore node highlight:', e);
                  }
                }, 4000);
              }
            });
            
            figma.notify(`Highlighting ${targetNodes.length} area(s) related to: ${msg.violationContext.title}`);
          } else {
            // Fallback to frame-level highlighting
            console.log('MAIN CODE - No specific nodes found, highlighting frame');
            figma.viewport.scrollAndZoomIntoView([targetFrame]);
            figma.notify(`Showing frame for: ${msg.violationContext.title}`);
          }
        } else {
          figma.notify('No frames selected to analyze');
        }
        break;
    }
  } catch (error) {
    console.error('Plugin Error:', error);
    figma.ui.postMessage({
      type: 'analysis-error',
      error: 'Plugin error: ' + error.message
    });
  }
};

// Initialize with current selection
if (figma.selection === undefined || figma.selection === null) {
  currentSelection = figma.currentPage.selection || [];
} else {
  currentSelection = figma.selection;
}

updateFrameSelection();
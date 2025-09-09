figma.showUI(__html__, { width: 580, height: 800 });

console.log('MAIN CODE - Plugin started, UI shown');

// USER API KEY VERSION - Calls OpenAI directly from plugin
// No Railway server needed - users bring their own API keys

// PRODUCTION: Simplified serialization focused on AI analysis needs
function serializeNodeForAI(node, depth) {
  if (depth === undefined) depth = 0;
  if (depth > 6 || !node) return null; // Reduced depth for speed
  
  var serialized = {
    id: node.id,
    name: (typeof node.name === 'string') ? node.name : '',
    type: node.type,
    visible: node.visible !== false, // Default to true if undefined
    width: (typeof node.width === 'number') ? Math.round(node.width) : 0,
    height: (typeof node.height === 'number') ? Math.round(node.height) : 0,
    figmaId: node.id // Include the actual Figma node ID for direct targeting
  };
  
  // Only serialize what AI needs for analysis
  if (node.type === "TEXT" && node.characters && typeof node.characters === 'string') {
    serialized.text = node.characters;
    var fontSize = (typeof node.fontSize === 'number') ? node.fontSize : 14;
    if (fontSize !== 14) serialized.fontSize = Math.round(fontSize);
  }
  
  // Only include layout if non-default
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    serialized.layout = node.layoutMode;
  }
  
  // PERFORMANCE: Strict children limits
  serialized.children = [];
  if (node.children && Array.isArray(node.children) && node.children.length > 0 && depth < 5) {
    var maxChildren = Math.min(node.children.length, 15); // Aggressive limit
    for (var i = 0; i < maxChildren; i++) {
      var child = serializeNodeForAI(node.children[i], depth + 1);
      if (child && child.visible) { // Only include visible children
        serialized.children.push(child);
      }
    }
  }
  
  return serialized;
}

// PRODUCTION: Lightweight context analysis for faster processing
function analyzeDesignContext(frames, userContext, ignoreRepeatedText) {
  var textContent = '';
  var interactiveCount = 0;
  var totalNodes = 0;
  
  function extractEssentials(node) {
    if (!node || node.visible === false) return;
    totalNodes++;
    
    if (node.type === 'TEXT' && node.characters && textContent.length < 2000) {
      // If ignoreRepeatedText is true, only add unique text
      if (ignoreRepeatedText) {
        var newText = node.characters + ' ';
        if (textContent.indexOf(newText.trim()) === -1) {
          textContent += newText;
        }
      } else {
        textContent += node.characters + ' ';
      }
    }
    
    var nodeName = (node.name || '').toLowerCase();
    if (/\b(button|btn|click|link|nav|menu|input|field)\b/.test(nodeName)) {
      interactiveCount++;
    }
    
    if (node.children && totalNodes < 200) { // Hard limit for performance
      for (var i = 0; i < Math.min(node.children.length, 10); i++) {
        extractEssentials(node.children[i]);
      }
    }
  }
  
  for (var i = 0; i < Math.min(frames.length, 10); i++) {
    extractEssentials(frames[i]);
  }
  
  return {
    designType: detectDesignType(textContent),
    complexity: totalNodes > 100 ? 'high' : totalNodes > 50 ? 'medium' : 'low',
    hasInteractiveElements: interactiveCount > 0,
    userContext: userContext || '',
    ignoreRepeatedText: ignoreRepeatedText || false,
    textSample: textContent.slice(0, 500)
  };
}

function detectDesignType(textContent) {
  var lower = textContent.toLowerCase();
  if (/\b(sign in|log in|password|email)\b/.test(lower)) return 'authentication';
  if (/\b(welcome|get started|tutorial)\b/.test(lower)) return 'onboarding';
  if (/\b(dashboard|analytics|metrics|overview)\b/.test(lower)) return 'dashboard';
  if (/\b(submit|required|input|form)\b/.test(lower)) return 'form';
  return 'interface';
}

// PRODUCTION: Frame selection and state management
var currentSelection = [];
var selectedFrames = [];

figma.on('selectionchange', function() {
  currentSelection = figma.selection || figma.currentPage.selection || [];
  updateFrameSelection();
});

function updateFrameSelection() {
  selectedFrames = [];
  
  for (var i = 0; i < currentSelection.length; i++) {
    var node = currentSelection[i];
    if (node && ['FRAME', 'GROUP', 'SECTION', 'COMPONENT', 'INSTANCE'].indexOf(node.type) !== -1) {
      selectedFrames.push(node);
    }
  }
  
  figma.ui.postMessage({
    type: 'selection-changed',
    frames: selectedFrames.map(function(frame) {
      return {
        id: frame.id,
        name: frame.name,
        width: frame.width,
        height: frame.height,
        type: frame.type
      };
    })
  });
}

// PRODUCTION: Fast violation focusing with improved node matching
function handleViolationFocus(violationContext) {
  if (!violationContext || selectedFrames.length === 0) {
    figma.notify("Cannot focus on violation");
    return Promise.resolve();
  }

  return new Promise(function(resolve) {
    try {
      console.log('Looking for violation:', violationContext);
      
      var targetNode = findBestMatchingNode(violationContext);
      
      if (targetNode) {
        figma.getNodeByIdAsync(targetNode.id)
          .then(function(node) {
            if (node) {
              figma.currentPage.selection = [node];
              figma.viewport.scrollAndZoomIntoView([node]);
              figma.notify('Highlighting: ' + (node.name || 'element'));
              highlightNodeSimple(node);
            } else {
              fallbackToFrames();
            }
            resolve();
          })
          .catch(function() {
            fallbackToFrames();
            resolve();
          });
      } else {
        fallbackToFrames();
        resolve();
      }
    } catch (error) {
      fallbackToFrames();
      resolve();
    }
  });
  
  function fallbackToFrames() {
    figma.currentPage.selection = selectedFrames;
    figma.viewport.scrollAndZoomIntoView(selectedFrames);
    figma.notify('Could not locate specific element');
  }
}

function findBestMatchingNode(violationContext) {
  var candidates = [];
  
  // Collect all possible keywords from the violation
  var keywords = extractAllKeywords(violationContext);
  console.log('Keywords extracted:', keywords);
  
  // Search through all nodes in selected frames
  for (var f = 0; f < selectedFrames.length; f++) {
    searchAllNodes(selectedFrames[f], keywords, candidates, 0);
  }
  
  // Score and sort candidates
  candidates.sort(function(a, b) {
    return b.score - a.score;
  });
  
  console.log('Top candidates:', candidates.slice(0, 3));
  
  return candidates.length > 0 ? candidates[0].node : null;
}

function extractAllKeywords(violation) {
  var keywords = [];
  var sources = [
    violation.title,
    violation.description,
    violation.location,
    violation.recommendation
  ];
  
  for (var i = 0; i < sources.length; i++) {
    var source = sources[i];
    if (source && typeof source === 'string') {
      // Extract quoted content (likely element names)
      var quoted = source.match(/"([^"]+)"/g);
      if (quoted) {
        for (var j = 0; j < quoted.length; j++) {
          keywords.push(quoted[j].replace(/"/g, '').toLowerCase());
        }
      }
      
      // Extract numbers (often important identifiers)
      var numbers = source.match(/\b\d+\b/g);
      if (numbers) {
        for (var k = 0; k < numbers.length; k++) {
          keywords.push(numbers[k]);
        }
      }
      
      // Extract UI element types
      var uiTypes = source.match(/\b(button|input|field|card|menu|nav|form|link|icon|text|label|number|title|header|footer)\b/gi);
      if (uiTypes) {
        for (var l = 0; l < uiTypes.length; l++) {
          keywords.push(uiTypes[l].toLowerCase());
        }
      }
      
      // Extract words from location path
      if (source === violation.location) {
        var pathWords = source.split(/[>\-\+\(\)\s]+/);
        for (var m = 0; m < pathWords.length; m++) {
          var word = pathWords[m].trim().toLowerCase();
          if (word.length > 2) {
            keywords.push(word);
          }
        }
      }
    }
  }
  
  return keywords;
}

function searchAllNodes(node, keywords, candidates, depth) {
  if (depth > 8 || !node) return;
  
  var score = calculateMatchScore(node, keywords);
  if (score > 0) {
    candidates.push({ node: node, score: score });
  }
  
  if (node.children && Array.isArray(node.children)) {
    for (var i = 0; i < node.children.length; i++) {
      searchAllNodes(node.children[i], keywords, candidates, depth + 1);
    }
  }
}

function calculateMatchScore(node, keywords) {
  var score = 0;
  var nodeName = (node.name || '').toLowerCase();
  var nodeText = '';
  
  // Get text content if it's a text node
  if (node.type === 'TEXT' && node.characters) {
    nodeText = node.characters.toLowerCase();
  }
  
  for (var i = 0; i < keywords.length; i++) {
    var keyword = keywords[i].toLowerCase();
    
    // Exact name match (highest score)
    if (nodeName === keyword) {
      score += 100;
    }
    // Name contains keyword
    else if (nodeName.includes(keyword)) {
      score += 50;
    }
    // Text content matches
    else if (nodeText.includes(keyword)) {
      score += 30;
    }
    // Partial match
    else if (keyword.length > 3 && (nodeName.includes(keyword) || keyword.includes(nodeName))) {
      score += 20;
    }
  }
  
  return score;
}

function highlightNodeSimple(node) {
  try {
    if (node.hasOwnProperty("strokes")) {
      var originalStrokes = node.strokes;
      var originalStrokeWeight = node.strokeWeight;
      
      // Create a very obvious highlight
      node.strokes = [{ 
        type: "SOLID", 
        color: { r: 1, g: 0, b: 0 } 
      }];
      node.strokeWeight = 8; // Much thicker
      node.dashPattern = [15, 8]; // Animated dashing effect
      
      // Flash effect - change stroke weight to create pulsing
      var flashCount = 0;
      var flashInterval = setInterval(function() {
        try {
          if (flashCount < 6 && node.strokeWeight) {
            node.strokeWeight = flashCount % 2 === 0 ? 12 : 8;
            flashCount++;
          } else {
            clearInterval(flashInterval);
          }
        } catch (e) {
          clearInterval(flashInterval);
        }
      }, 300);
      
      // Remove highlight after 6 seconds
      setTimeout(function() {
        try {
          clearInterval(flashInterval);
          node.strokes = originalStrokes;
          node.strokeWeight = originalStrokeWeight;
          node.dashPattern = []; // Remove dashing
        } catch (e) {}
      }, 6000);
    }
  } catch (error) {
    console.error('Highlight error:', error);
  }
}

// PRODUCTION: Main message handler with comprehensive error handling
figma.ui.onmessage = function(msg) {
  try {
    switch (msg.type) {
      case 'get-initial-state':
        updateFrameSelection();
        break;
      
      case 'focus-selected-frames':
        if (selectedFrames.length > 0) {
          figma.currentPage.selection = selectedFrames;
          figma.viewport.scrollAndZoomIntoView(selectedFrames);
          figma.notify('Focused on ' + selectedFrames.length + ' frame(s)');
        } else {
          figma.notify('No frames selected');
        }
        break;
      
      case 'serialize-frames':
        handleFrameSerialization(msg);
        break;

      case 'focus-violation-area-optimized':
        handleViolationFocus(msg.violationContext);
        break;

      case 'show-notification':
        figma.notify(msg.message, { timeout: msg.timeout || 3000 });
        break;
      
      case 'close-plugin':
        figma.closePlugin();
        break;
    }
  } catch (error) {
    console.error('Plugin Error:', error);
    figma.ui.postMessage({
      type: 'serialization-error',
      error: 'Plugin error occurred. Please try again.'
    });
  }
};

function handleFrameSerialization(msg) {
  if (selectedFrames.length === 0) {
    figma.ui.postMessage({ 
      type: 'serialization-error', 
      error: 'Please select one or more frames to analyze.' 
    });
    return;
  }

  try {
    // Allow more frames for complex design analysis
    var framesToAnalyze = selectedFrames.slice(0, 8); // Up to 8 frames
    
    // OPTIMIZED: Lightweight serialization
    var payload = [];
    for (var i = 0; i < framesToAnalyze.length; i++) {
      var serialized = serializeNodeForAI(framesToAnalyze[i]);
      if (serialized) {
        payload.push(serialized);
      }
    }
    
    console.log('Serialized design data:', payload.length + ' frames');
    
    // Create context analysis
    var contextAnalysis = analyzeDesignContext(payload, msg.context, msg.ignoreRepeatedText);
    
    // Send serialized data back to UI for OpenAI analysis
    figma.ui.postMessage({
      type: 'serialization-complete',
      designData: {
        frames: payload,
        contextAnalysis: contextAnalysis
      }
    });
      
  } catch (error) {
    console.error('Serialization error:', error);
    figma.ui.postMessage({
      type: 'serialization-error',
      error: 'Failed to prepare design for analysis. Please try selecting different frames.'
    });
  }
}

// Initialize
currentSelection = figma.selection || figma.currentPage.selection || [];
updateFrameSelection();

console.log('FIGMA CODE - User API key version loaded');

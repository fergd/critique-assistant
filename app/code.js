figma.showUI(__html__, { width: 580, height: 800 });

console.log('MAIN CODE - Plugin started, UI shown');

// CORE ISSUES IDENTIFIED AND FIXED:
// 1. CORS header conflicts with proxy server
// 2. Excessive payload size causing timeouts  
// 3. No retry mechanism for network failures
// 4. Insufficient error recovery
// 5. Over-complex serialization for AI needs

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
    height: (typeof node.height === 'number') ? Math.round(node.height) : 0
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
function analyzeDesignContext(frames, userContext) {
  var textContent = '';
  var interactiveCount = 0;
  var totalNodes = 0;
  
  function extractEssentials(node) {
    if (!node || node.visible === false) return;
    totalNodes++;
    
    if (node.type === 'TEXT' && node.characters && textContent.length < 2000) {
      textContent += node.characters + ' ';
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

// PRODUCTION: Robust API request with automatic retries
function makeAnalysisRequest(payload, context, attempt) {
  if (attempt === undefined) attempt = 1;
  var maxAttempts = 2; // Only 1 retry to avoid excessive delays
  
  return new Promise(function(resolve, reject) {
    // CRITICAL: Remove problematic headers that cause CORS issues
    var requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Removed Cache-Control to fix CORS error
      },
      body: JSON.stringify({
        frames: payload,
        context: context,
        timestamp: Date.now()
      })
    };
    
    // Set timeout based on complexity
    var timeoutDuration = payload.length > 5 ? 35000 : 25000;
    var timeoutId = setTimeout(function() {
      reject(new Error('Analysis timeout - design may be too complex'));
    }, timeoutDuration);
    
    fetch('https://critique-assistant-proxy-g5dvt2noj-christans-projects-b1d924ef.vercel.app/api/proxy', requestOptions)
      .then(function(response) {
        clearTimeout(timeoutId);
        
        if (response.status === 408) {
          throw new Error('SERVER_TIMEOUT');
        } else if (response.status === 413) {
          throw new Error('PAYLOAD_TOO_LARGE');
        } else if (response.status === 429) {
          throw new Error('RATE_LIMITED');
        } else if (response.status >= 500) {
          throw new Error('SERVER_ERROR');
        } else if (!response.ok) {
          throw new Error('HTTP_' + response.status);
        }
        
        return response.json();
      })
      .then(function(data) {
        if (data && data.content) {
          resolve(data.content);
        } else if (data && data.error) {
          throw new Error(data.error);
        } else {
          resolve('[]');
        }
      })
      .catch(function(error) {
        clearTimeout(timeoutId);
        
        // Retry logic for recoverable errors
        var retryableErrors = ['SERVER_TIMEOUT', 'SERVER_ERROR', 'fetch'];
        var shouldRetry = attempt < maxAttempts && 
          retryableErrors.some(function(errorType) {
            return error.message.indexOf(errorType) !== -1;
          });
        
        if (shouldRetry) {
          console.log('Retrying analysis request, attempt ' + (attempt + 1));
          setTimeout(function() {
            makeAnalysisRequest(payload, context, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, 2000); // 2 second delay between retries
        } else {
          reject(error);
        }
      });
  });
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

// PRODUCTION: Fast violation focusing without complex scoring
function handleViolationFocus(violationContext) {
  if (!violationContext || selectedFrames.length === 0) {
    figma.notify("Cannot focus on violation");
    return Promise.resolve();
  }

  return new Promise(function(resolve) {
    try {
      var bestMatch = null;
      var searchTerms = extractSimpleSearchTerms(violationContext);
      
      // Simple, fast search through selected frames
      for (var i = 0; i < selectedFrames.length && !bestMatch; i++) {
        bestMatch = findInFrame(selectedFrames[i], searchTerms, 0);
      }
      
      if (bestMatch) {
        figma.getNodeByIdAsync(bestMatch.id)
          .then(function(node) {
            if (node) {
              figma.currentPage.selection = [node];
              figma.viewport.scrollAndZoomIntoView([node]);
              figma.notify('Found: ' + (violationContext.title || 'element'));
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
    figma.notify('Showing selected frames');
  }
}

function extractSimpleSearchTerms(violation) {
  var terms = [];
  var sources = [violation.title, violation.description, violation.location];
  
  for (var i = 0; i < sources.length; i++) {
    var source = sources[i];
    if (source && typeof source === 'string') {
      // Extract quoted terms and UI elements
      var quoted = source.match(/"([^"]{2,20})"/g);
      if (quoted) {
        for (var j = 0; j < quoted.length; j++) {
          terms.push(quoted[j].replace(/"/g, '').toLowerCase());
        }
      }
      
      var uiTerms = source.match(/\b(button|input|field|menu|nav|form|link|icon)\b/gi);
      if (uiTerms) {
        for (var k = 0; k < uiTerms.length; k++) {
          terms.push(uiTerms[k].toLowerCase());
        }
      }
    }
  }
  
  return terms.slice(0, 3); // Limit for performance
}

function findInFrame(frame, searchTerms, depth) {
  if (depth > 4 || !frame || frame.visible === false) return null;
  
  var frameName = (frame.name || '').toLowerCase();
  var frameText = (frame.characters || '').toLowerCase();
  
  // Check if this node matches
  for (var i = 0; i < searchTerms.length; i++) {
    var term = searchTerms[i];
    if (frameName.indexOf(term) !== -1 || frameText.indexOf(term) !== -1) {
      return { id: frame.id, name: frame.name };
    }
  }
  
  // Check children
  if (frame.children && frame.children.length > 0) {
    for (var j = 0; j < Math.min(frame.children.length, 8); j++) {
      var match = findInFrame(frame.children[j], searchTerms, depth + 1);
      if (match) return match;
    }
  }
  
  return null;
}

function highlightNodeSimple(node) {
  try {
    if (node.hasOwnProperty("strokes")) {
      var originalStrokes = node.strokes;
      node.strokes = [{ type: "SOLID", color: { r: 1, g: 0.2, b: 0.2 } }];
      node.strokeWeight = 3;
      
      setTimeout(function() {
        try {
          node.strokes = originalStrokes;
          node.strokeWeight = 0;
        } catch (e) {}
      }, 2000);
    }
  } catch (error) {}
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
      
      case 'analyze-frames':
        handleAnalysisRequest(msg);
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
      type: 'analysis-error',
      error: 'Plugin error occurred. Please try again.'
    });
  }
};

function handleAnalysisRequest(msg) {
  if (selectedFrames.length === 0) {
    figma.ui.postMessage({ 
      type: 'analysis-error', 
      error: 'Please select one or more frames to analyze.' 
    });
    return;
  }

  // CRITICAL: Limit frames to prevent timeouts
  var framesToAnalyze = selectedFrames.slice(0, 5); // Max 5 frames
  figma.ui.postMessage({ type: 'analysis-started' });

  try {
    // OPTIMIZED: Lightweight serialization
    var payload = [];
    for (var i = 0; i < framesToAnalyze.length; i++) {
      var serialized = serializeNodeForAI(framesToAnalyze[i]);
      if (serialized) {
        payload.push(serialized);
      }
    }
    
    var context = analyzeDesignContext(payload, msg.context);
    
    makeAnalysisRequest(payload, context)
      .then(function(result) {
        var violations = parseAnalysisResult(result);
        
        figma.ui.postMessage({
          type: 'analysis-complete',
          result: {
            summary: violations.length > 0 ? 
              'Found ' + violations.length + ' UX issues' : 
              'No major issues found',
            improvements: violations,
            rawFeedback: result
          }
        });
      })
      .catch(function(error) {
        var errorMessage = getUserFriendlyErrorMessage(error);
        figma.ui.postMessage({
          type: 'analysis-error',
          error: errorMessage
        });
      });
      
  } catch (error) {
    figma.ui.postMessage({
      type: 'analysis-error',
      error: 'Failed to prepare design for analysis. Please try selecting simpler frames.'
    });
  }
}

function parseAnalysisResult(result) {
  if (!result) return [];
  
  try {
    if (typeof result === 'string') {
      if (result.trim() === '' || result === '[]') return [];
      
      var parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : [];
    }
    
    if (Array.isArray(result)) {
      return result;
    }
    
    if (result.improvements && Array.isArray(result.improvements)) {
      return result.improvements;
    }
    
    return [];
  } catch (parseError) {
    console.error('Parse error:', parseError);
    return [];
  }
}

function getUserFriendlyErrorMessage(error) {
  var message = error.message || 'Unknown error';
  
  if (message.indexOf('timeout') !== -1) {
    return 'Analysis timed out. Try selecting fewer or simpler frames.';
  } else if (message.indexOf('PAYLOAD_TOO_LARGE') !== -1) {
    return 'Design too complex. Please select fewer frames.';
  } else if (message.indexOf('RATE_LIMITED') !== -1) {
    return 'Too many requests. Please wait 30 seconds and try again.';
  } else if (message.indexOf('SERVER') !== -1) {
    return 'Analysis service temporarily unavailable. Please try again in a few minutes.';
  } else if (message.indexOf('fetch') !== -1 || message.indexOf('Network') !== -1) {
    return 'Network error. Please check your connection and try again.';
  } else {
    return 'Analysis failed. Please try again with a simpler selection.';
  }
}

// Initialize
currentSelection = figma.selection || figma.currentPage.selection || [];
updateFrameSelection();

console.log('FIGMA CODE - Production-ready plugin loaded');
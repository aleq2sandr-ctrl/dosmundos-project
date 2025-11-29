var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// plugins/visual-editor/vite-plugin-react-inline-editor.js
var vite_plugin_react_inline_editor_exports = {};
__export(vite_plugin_react_inline_editor_exports, {
  default: () => inlineEditPlugin
});
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "file:///C:/Users/alexb/OneDrive/Desktop/App/_GitHub/dosmundos/node_modules/@babel/parser/lib/index.js";
import traverseBabel from "file:///C:/Users/alexb/OneDrive/Desktop/App/_GitHub/dosmundos/node_modules/@babel/traverse/lib/index.js";
import generate from "file:///C:/Users/alexb/OneDrive/Desktop/App/_GitHub/dosmundos/node_modules/@babel/generator/lib/index.js";
import * as t from "file:///C:/Users/alexb/OneDrive/Desktop/App/_GitHub/dosmundos/node_modules/@babel/types/lib/index.js";
import fs from "fs";
function parseEditId(editId) {
  const parts = editId.split(":");
  if (parts.length < 3) {
    return null;
  }
  const column = parseInt(parts.at(-1), 10);
  const line = parseInt(parts.at(-2), 10);
  const filePath = parts.slice(0, -2).join(":");
  if (!filePath || isNaN(line) || isNaN(column)) {
    return null;
  }
  return { filePath, line, column };
}
function checkTagNameEditable(openingElementNode, editableTagsList) {
  if (!openingElementNode || !openingElementNode.name)
    return false;
  const nameNode = openingElementNode.name;
  if (nameNode.type === "JSXIdentifier" && editableTagsList.includes(nameNode.name)) {
    return true;
  }
  if (nameNode.type === "JSXMemberExpression" && nameNode.property && nameNode.property.type === "JSXIdentifier" && editableTagsList.includes(nameNode.property.name)) {
    return true;
  }
  return false;
}
function inlineEditPlugin() {
  return {
    name: "vite-inline-edit-plugin",
    enforce: "pre",
    transform(code, id) {
      if (!/\.(jsx|tsx)$/.test(id) || !id.startsWith(VITE_PROJECT_ROOT) || id.includes("node_modules")) {
        return null;
      }
      const relativeFilePath = path.relative(VITE_PROJECT_ROOT, id);
      const webRelativeFilePath = relativeFilePath.split(path.sep).join("/");
      try {
        const babelAst = parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
          errorRecovery: true
        });
        let attributesAdded = 0;
        traverseBabel.default(babelAst, {
          enter(path3) {
            if (path3.isJSXOpeningElement()) {
              const openingNode = path3.node;
              const elementNode = path3.parentPath.node;
              if (!openingNode.loc) {
                return;
              }
              const alreadyHasId = openingNode.attributes.some(
                (attr) => t.isJSXAttribute(attr) && attr.name.name === "data-edit-id"
              );
              if (alreadyHasId) {
                return;
              }
              const isCurrentElementEditable = checkTagNameEditable(openingNode, EDITABLE_HTML_TAGS);
              if (!isCurrentElementEditable) {
                return;
              }
              let shouldBeDisabledDueToChildren = false;
              if (t.isJSXElement(elementNode) && elementNode.children) {
                const hasPropsSpread = openingNode.attributes.some(
                  (attr) => t.isJSXSpreadAttribute(attr) && attr.argument && t.isIdentifier(attr.argument) && attr.argument.name === "props"
                );
                const hasDynamicChild = elementNode.children.some(
                  (child) => t.isJSXExpressionContainer(child)
                );
                if (hasDynamicChild || hasPropsSpread) {
                  shouldBeDisabledDueToChildren = true;
                }
              }
              if (!shouldBeDisabledDueToChildren && t.isJSXElement(elementNode) && elementNode.children) {
                const hasEditableJsxChild = elementNode.children.some((child) => {
                  if (t.isJSXElement(child)) {
                    return checkTagNameEditable(child.openingElement, EDITABLE_HTML_TAGS);
                  }
                  return false;
                });
                if (hasEditableJsxChild) {
                  shouldBeDisabledDueToChildren = true;
                }
              }
              if (shouldBeDisabledDueToChildren) {
                const disabledAttribute = t.jsxAttribute(
                  t.jsxIdentifier("data-edit-disabled"),
                  t.stringLiteral("true")
                );
                openingNode.attributes.push(disabledAttribute);
                attributesAdded++;
                return;
              }
              if (t.isJSXElement(elementNode) && elementNode.children && elementNode.children.length > 0) {
                let hasNonEditableJsxChild = false;
                for (const child of elementNode.children) {
                  if (t.isJSXElement(child)) {
                    if (!checkTagNameEditable(child.openingElement, EDITABLE_HTML_TAGS)) {
                      hasNonEditableJsxChild = true;
                      break;
                    }
                  }
                }
                if (hasNonEditableJsxChild) {
                  const disabledAttribute = t.jsxAttribute(
                    t.jsxIdentifier("data-edit-disabled"),
                    t.stringLiteral("true")
                  );
                  openingNode.attributes.push(disabledAttribute);
                  attributesAdded++;
                  return;
                }
              }
              let currentAncestorCandidatePath = path3.parentPath.parentPath;
              while (currentAncestorCandidatePath) {
                const ancestorJsxElementPath = currentAncestorCandidatePath.isJSXElement() ? currentAncestorCandidatePath : currentAncestorCandidatePath.findParent((p) => p.isJSXElement());
                if (!ancestorJsxElementPath) {
                  break;
                }
                if (checkTagNameEditable(ancestorJsxElementPath.node.openingElement, EDITABLE_HTML_TAGS)) {
                  return;
                }
                currentAncestorCandidatePath = ancestorJsxElementPath.parentPath;
              }
              const line = openingNode.loc.start.line;
              const column = openingNode.loc.start.column + 1;
              const editId = `${webRelativeFilePath}:${line}:${column}`;
              const idAttribute = t.jsxAttribute(
                t.jsxIdentifier("data-edit-id"),
                t.stringLiteral(editId)
              );
              openingNode.attributes.push(idAttribute);
              attributesAdded++;
            }
          }
        });
        if (attributesAdded > 0) {
          const generateFunction = generate.default || generate;
          const output = generateFunction(babelAst, {
            sourceMaps: true,
            sourceFileName: webRelativeFilePath
          }, code);
          return { code: output.code, map: output.map };
        }
        return null;
      } catch (error) {
        console.error(`[vite][visual-editor] Error transforming ${id}:`, error);
        return null;
      }
    },
    // Updates source code based on the changes received from the client
    configureServer(server) {
      server.middlewares.use("/api/apply-edit", async (req, res, next) => {
        if (req.method !== "POST")
          return next();
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", async () => {
          var _a;
          let absoluteFilePath = "";
          try {
            const { editId, newFullText } = JSON.parse(body);
            if (!editId || typeof newFullText === "undefined") {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Missing editId or newFullText" }));
            }
            const parsedId = parseEditId(editId);
            if (!parsedId) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Invalid editId format (filePath:line:column)" }));
            }
            const { filePath, line, column } = parsedId;
            absoluteFilePath = path.resolve(VITE_PROJECT_ROOT, filePath);
            if (filePath.includes("..") || !absoluteFilePath.startsWith(VITE_PROJECT_ROOT) || absoluteFilePath.includes("node_modules")) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Invalid path" }));
            }
            const originalContent = fs.readFileSync(absoluteFilePath, "utf-8");
            const babelAst = parse(originalContent, {
              sourceType: "module",
              plugins: ["jsx", "typescript"],
              errorRecovery: true
            });
            let targetNodePath = null;
            const visitor = {
              JSXOpeningElement(path3) {
                const node = path3.node;
                if (node.loc && node.loc.start.line === line && node.loc.start.column + 1 === column) {
                  targetNodePath = path3;
                  path3.stop();
                }
              }
            };
            traverseBabel.default(babelAst, visitor);
            if (!targetNodePath) {
              res.writeHead(404, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Target node not found by line/column", editId }));
            }
            const generateFunction = generate.default || generate;
            const parentElementNode = (_a = targetNodePath.parentPath) == null ? void 0 : _a.node;
            let beforeCode = "";
            if (parentElementNode && t.isJSXElement(parentElementNode)) {
              const beforeOutput = generateFunction(parentElementNode, {});
              beforeCode = beforeOutput.code;
            }
            let modified = false;
            if (parentElementNode && t.isJSXElement(parentElementNode)) {
              parentElementNode.children = [];
              if (newFullText && newFullText.trim() !== "") {
                const newTextNode = t.jsxText(newFullText);
                parentElementNode.children.push(newTextNode);
              }
              modified = true;
            }
            if (!modified) {
              res.writeHead(409, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Could not apply changes to AST." }));
            }
            let afterCode = "";
            if (parentElementNode && t.isJSXElement(parentElementNode)) {
              const afterOutput = generateFunction(parentElementNode, {});
              afterCode = afterOutput.code;
            }
            const output = generateFunction(babelAst, {});
            const newContent = output.code;
            const extractText = (code) => {
              if (!code)
                return "";
              const textMatch = code.match(/>(.*?)</s);
              return textMatch ? textMatch[1].trim() : "";
            };
            const contentBefore = extractText(beforeCode);
            const contentAfter = newFullText;
            try {
              fs.writeFileSync(absoluteFilePath, newContent, "utf-8");
            } catch (writeError) {
              console.error(`[vite][visual-editor] Error during direct write for ${filePath}:`, writeError);
              throw writeError;
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              success: true,
              newFileContent: newContent,
              beforeCode,
              afterCode,
              // Include data for history tracking
              editData: {
                editId,
                filePath,
                line,
                column,
                contentBefore,
                contentAfter
              }
            }));
          } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal server error during edit application." }));
          }
        });
      });
    }
  };
}
var __vite_injected_original_import_meta_url, __filename, __dirname2, VITE_PROJECT_ROOT, EDITABLE_HTML_TAGS;
var init_vite_plugin_react_inline_editor = __esm({
  "plugins/visual-editor/vite-plugin-react-inline-editor.js"() {
    __vite_injected_original_import_meta_url = "file:///C:/Users/alexb/OneDrive/Desktop/App/_GitHub/dosmundos/plugins/visual-editor/vite-plugin-react-inline-editor.js";
    __filename = fileURLToPath(__vite_injected_original_import_meta_url);
    __dirname2 = path.dirname(__filename);
    VITE_PROJECT_ROOT = path.resolve(__dirname2, "../..");
    EDITABLE_HTML_TAGS = ["a", "Button", "button", "p", "span", "h1", "h2", "h3", "h4"];
  }
});

// plugins/visual-editor/visual-editor-config.js
var EDIT_MODE_STYLES;
var init_visual_editor_config = __esm({
  "plugins/visual-editor/visual-editor-config.js"() {
    EDIT_MODE_STYLES = `
  #root[data-edit-mode-enabled="true"] [data-edit-id] {
    cursor: pointer; 
    outline: 1px dashed #357DF9; 
    outline-offset: 2px;
    min-height: 1em;
  }
  #root[data-edit-mode-enabled="true"] {
    cursor: pointer;
  }
  #root[data-edit-mode-enabled="true"] [data-edit-id]:hover {
    background-color: #357DF933;
    outline-color: #357DF9; 
  }

  @keyframes fadeInTooltip {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  #inline-editor-disabled-tooltip {
    display: none; 
    opacity: 0; 
    position: absolute;
    background-color: #1D1D20;
    color: white;
    padding: 4px 8px;
    border-radius: 8px;
    z-index: 10001;
    font-size: 14px;
    border: 1px solid #3B3D4A;
    max-width: 184px;
    text-align: center;
  }

  #inline-editor-disabled-tooltip.tooltip-active {
    display: block;
    animation: fadeInTooltip 0.2s ease-out forwards;
  }
`;
  }
});

// plugins/visual-editor/vite-plugin-edit-mode.js
var vite_plugin_edit_mode_exports = {};
__export(vite_plugin_edit_mode_exports, {
  default: () => inlineEditDevPlugin
});
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
function inlineEditDevPlugin() {
  return {
    name: "vite:inline-edit-dev",
    apply: "serve",
    transformIndexHtml() {
      const scriptPath = resolve(__dirname3, "edit-mode-script.js");
      const scriptContent = readFileSync(scriptPath, "utf-8");
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: scriptContent,
          injectTo: "body"
        },
        {
          tag: "style",
          children: EDIT_MODE_STYLES,
          injectTo: "head"
        }
      ];
    }
  };
}
var __vite_injected_original_import_meta_url2, __filename2, __dirname3;
var init_vite_plugin_edit_mode = __esm({
  "plugins/visual-editor/vite-plugin-edit-mode.js"() {
    init_visual_editor_config();
    __vite_injected_original_import_meta_url2 = "file:///C:/Users/alexb/OneDrive/Desktop/App/_GitHub/dosmundos/plugins/visual-editor/vite-plugin-edit-mode.js";
    __filename2 = fileURLToPath2(__vite_injected_original_import_meta_url2);
    __dirname3 = resolve(__filename2, "..");
  }
});

// vite.config.js
import path2 from "node:path";
import react from "file:///C:/Users/alexb/OneDrive/Desktop/App/_GitHub/dosmundos/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { createLogger, defineConfig } from "file:///C:/Users/alexb/OneDrive/Desktop/App/_GitHub/dosmundos/node_modules/vite/dist/node/index.js";
var __vite_injected_original_dirname = "C:\\Users\\alexb\\OneDrive\\Desktop\\App\\_GitHub\\dosmundos";
var isDev = process.env.NODE_ENV !== "production";
var inlineEditPlugin2;
var editModeDevPlugin;
if (isDev) {
  inlineEditPlugin2 = (await Promise.resolve().then(() => (init_vite_plugin_react_inline_editor(), vite_plugin_react_inline_editor_exports))).default;
  editModeDevPlugin = (await Promise.resolve().then(() => (init_vite_plugin_edit_mode(), vite_plugin_edit_mode_exports))).default;
}
var configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;
var configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;
var configHorizonsConsoleErrroHandler = `
const originalConsoleError = console.error;
console.error = function(...args) {
	originalConsoleError.apply(console, args);

	let errorString = '';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			errorString = arg.stack || \`\${arg.name}: \${arg.message}\`;
			break;
		}
	}

	if (!errorString) {
		errorString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
	}

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: errorString
	}, '*');
};
`;
var configWindowFetchMonkeyPatch = `
const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			// Silence expected non-OK responses for lightweight probe endpoints
			// Example: /api/upload/info/:filename returns 404 when a file doesn't exist (this is OK)
			const requestUrl = response.url;
			const shouldSilence =
				typeof requestUrl === 'string' &&
				(
					requestUrl.includes('/api/upload/info/') ||
					requestUrl.includes('/api/assemblyai/status')
				);

			if (!response.ok && !isDocumentResponse && !shouldSilence) {
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/\\.html?$/i)) {
				console.error(error);
			}

			throw error;
		});
};
`;
var addTransformIndexHtml = {
  name: "add-transform-index-html",
  transformIndexHtml(html) {
    return {
      html,
      tags: [
        {
          tag: "script",
          attrs: { type: "module" },
          children: configHorizonsRuntimeErrorHandler,
          injectTo: "head"
        },
        {
          tag: "script",
          attrs: { type: "module" },
          children: configHorizonsViteErrorHandler,
          injectTo: "head"
        },
        {
          tag: "script",
          attrs: { type: "module" },
          children: configHorizonsConsoleErrroHandler,
          injectTo: "head"
        },
        {
          tag: "script",
          attrs: { type: "module" },
          children: configWindowFetchMonkeyPatch,
          injectTo: "head"
        }
      ]
    };
  }
};
var logger = createLogger();
var loggerError = logger.error;
if (isDev) {
  logger.error = (msg, options) => {
    var _a;
    if ((_a = options == null ? void 0 : options.error) == null ? void 0 : _a.toString().includes("CssSyntaxError: [postcss]")) {
      return;
    }
    loggerError(msg, options);
  };
}
var enableDebugOverlays = isDev || process.env.VITE_DEBUG_OVERLAYS === "true";
var vite_config_default = defineConfig({
  customLogger: logger,
  plugins: [
    ...isDev ? [inlineEditPlugin2(), editModeDevPlugin()] : [],
    react(),
    ...enableDebugOverlays ? [addTransformIndexHtml] : []
  ],
  server: {
    cors: {
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Range", "Accept-Ranges", "Content-Range"]
    },
    headers: {
      "Cross-Origin-Embedder-Policy": "credentialless"
    },
    allowedHosts: true,
    proxy: {
      "/api": {
        // Route dev requests to local backend or VPS depending on env
        // Example to use VPS: set VITE_DEV_API_PROXY_TARGET=https://your-vps-host
        target: process.env.VITE_DEV_API_PROXY_TARGET || "http://localhost:3000",
        changeOrigin: true,
        secure: false
      },
      "/supabase-rest": {
        target: "https://supabase.dosmundos.pe",
        changeOrigin: true,
        secure: true,
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            req.headers.forEach((value, key) => {
              proxyReq.setHeader(key, value);
            });
            proxyReq.setHeader("Origin", "http://localhost:5173");
          });
          proxy.on("proxyRes", (proxyRes, req, res) => {
            proxyRes.headers["Access-Control-Allow-Origin"] = "*";
            proxyRes.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS,PATCH";
            proxyRes.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Range, Accept-Ranges, Content-Range, apikey";
          });
          proxy.on("error", (err, req, res) => {
            console.error("Supabase proxy error:", err);
          });
        }
      }
    }
  },
  resolve: {
    extensions: [".jsx", ".js", ".tsx", ".ts", ".json"],
    alias: {
      "@": path2.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: !isDev,
        drop_debugger: !isDev
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      external: [
        "@babel/parser",
        "@babel/traverse",
        "@babel/generator",
        "@babel/types"
      ]
    },
    outDir: "dist"
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsicGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanMiLCAicGx1Z2lucy92aXN1YWwtZWRpdG9yL3Zpc3VhbC1lZGl0b3ItY29uZmlnLmpzIiwgInBsdWdpbnMvdmlzdWFsLWVkaXRvci92aXRlLXBsdWdpbi1lZGl0LW1vZGUuanMiLCAidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhbGV4YlxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXEFwcFxcXFxfR2l0SHViXFxcXGRvc211bmRvc1xcXFxwbHVnaW5zXFxcXHZpc3VhbC1lZGl0b3JcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFsZXhiXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcQXBwXFxcXF9HaXRIdWJcXFxcZG9zbXVuZG9zXFxcXHBsdWdpbnNcXFxcdmlzdWFsLWVkaXRvclxcXFx2aXRlLXBsdWdpbi1yZWFjdC1pbmxpbmUtZWRpdG9yLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9hbGV4Yi9PbmVEcml2ZS9EZXNrdG9wL0FwcC9fR2l0SHViL2Rvc211bmRvcy9wbHVnaW5zL3Zpc3VhbC1lZGl0b3Ivdml0ZS1wbHVnaW4tcmVhY3QtaW5saW5lLWVkaXRvci5qc1wiO2ltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCc7XG5pbXBvcnQgeyBwYXJzZSB9IGZyb20gJ0BiYWJlbC9wYXJzZXInO1xuaW1wb3J0IHRyYXZlcnNlQmFiZWwgZnJvbSAnQGJhYmVsL3RyYXZlcnNlJztcbmltcG9ydCBnZW5lcmF0ZSBmcm9tICdAYmFiZWwvZ2VuZXJhdG9yJztcbmltcG9ydCAqIGFzIHQgZnJvbSAnQGJhYmVsL3R5cGVzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5cbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XG5jb25zdCBfX2Rpcm5hbWUgPSBwYXRoLmRpcm5hbWUoX19maWxlbmFtZSk7XG5jb25zdCBWSVRFX1BST0pFQ1RfUk9PVCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLicpO1xuY29uc3QgRURJVEFCTEVfSFRNTF9UQUdTID0gW1wiYVwiLCBcIkJ1dHRvblwiLCBcImJ1dHRvblwiLCBcInBcIiwgXCJzcGFuXCIsIFwiaDFcIiwgXCJoMlwiLCBcImgzXCIsIFwiaDRcIl07XG5cbmZ1bmN0aW9uIHBhcnNlRWRpdElkKGVkaXRJZCkge1xuICBjb25zdCBwYXJ0cyA9IGVkaXRJZC5zcGxpdCgnOicpO1xuXG4gIGlmIChwYXJ0cy5sZW5ndGggPCAzKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBjb2x1bW4gPSBwYXJzZUludChwYXJ0cy5hdCgtMSksIDEwKTtcbiAgY29uc3QgbGluZSA9IHBhcnNlSW50KHBhcnRzLmF0KC0yKSwgMTApO1xuICBjb25zdCBmaWxlUGF0aCA9IHBhcnRzLnNsaWNlKDAsIC0yKS5qb2luKCc6Jyk7XG5cbiAgaWYgKCFmaWxlUGF0aCB8fCBpc05hTihsaW5lKSB8fCBpc05hTihjb2x1bW4pKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgXG4gIHJldHVybiB7IGZpbGVQYXRoLCBsaW5lLCBjb2x1bW4gfTtcbn1cblxuZnVuY3Rpb24gY2hlY2tUYWdOYW1lRWRpdGFibGUob3BlbmluZ0VsZW1lbnROb2RlLCBlZGl0YWJsZVRhZ3NMaXN0KSB7XG4gICAgaWYgKCFvcGVuaW5nRWxlbWVudE5vZGUgfHwgIW9wZW5pbmdFbGVtZW50Tm9kZS5uYW1lKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgbmFtZU5vZGUgPSBvcGVuaW5nRWxlbWVudE5vZGUubmFtZTtcblxuICAgIC8vIENoZWNrIDE6IERpcmVjdCBuYW1lIChmb3IgPHA+LCA8QnV0dG9uPilcbiAgICBpZiAobmFtZU5vZGUudHlwZSA9PT0gJ0pTWElkZW50aWZpZXInICYmIGVkaXRhYmxlVGFnc0xpc3QuaW5jbHVkZXMobmFtZU5vZGUubmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgMjogUHJvcGVydHkgbmFtZSBvZiBhIG1lbWJlciBleHByZXNzaW9uIChmb3IgPG1vdGlvbi5oMT4sIGNoZWNrIGlmIFwiaDFcIiBpcyBpbiBlZGl0YWJsZVRhZ3NMaXN0KVxuICAgIGlmIChuYW1lTm9kZS50eXBlID09PSAnSlNYTWVtYmVyRXhwcmVzc2lvbicgJiYgbmFtZU5vZGUucHJvcGVydHkgJiYgbmFtZU5vZGUucHJvcGVydHkudHlwZSA9PT0gJ0pTWElkZW50aWZpZXInICYmIGVkaXRhYmxlVGFnc0xpc3QuaW5jbHVkZXMobmFtZU5vZGUucHJvcGVydHkubmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbmxpbmVFZGl0UGx1Z2luKCkgeyAgXG4gIHJldHVybiB7XG4gICAgbmFtZTogJ3ZpdGUtaW5saW5lLWVkaXQtcGx1Z2luJyxcbiAgICBlbmZvcmNlOiAncHJlJyxcblxuICAgIHRyYW5zZm9ybShjb2RlLCBpZCkge1xuICAgICAgaWYgKCEvXFwuKGpzeHx0c3gpJC8udGVzdChpZCkgfHwgIWlkLnN0YXJ0c1dpdGgoVklURV9QUk9KRUNUX1JPT1QpIHx8IGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVsYXRpdmVGaWxlUGF0aCA9IHBhdGgucmVsYXRpdmUoVklURV9QUk9KRUNUX1JPT1QsIGlkKTtcbiAgICAgIGNvbnN0IHdlYlJlbGF0aXZlRmlsZVBhdGggPSByZWxhdGl2ZUZpbGVQYXRoLnNwbGl0KHBhdGguc2VwKS5qb2luKCcvJyk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGJhYmVsQXN0ID0gcGFyc2UoY29kZSwge1xuICAgICAgICAgIHNvdXJjZVR5cGU6ICdtb2R1bGUnLFxuICAgICAgICAgIHBsdWdpbnM6IFsnanN4JywgJ3R5cGVzY3JpcHQnXSxcbiAgICAgICAgICBlcnJvclJlY292ZXJ5OiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxldCBhdHRyaWJ1dGVzQWRkZWQgPSAwO1xuXG4gICAgICAgIHRyYXZlcnNlQmFiZWwuZGVmYXVsdChiYWJlbEFzdCwge1xuICAgICAgICAgIGVudGVyKHBhdGgpIHtcbiAgICAgICAgICAgIGlmIChwYXRoLmlzSlNYT3BlbmluZ0VsZW1lbnQoKSkge1xuICAgICAgICAgICAgICBjb25zdCBvcGVuaW5nTm9kZSA9IHBhdGgubm9kZTtcbiAgICAgICAgICAgICAgY29uc3QgZWxlbWVudE5vZGUgPSBwYXRoLnBhcmVudFBhdGgubm9kZTsgLy8gVGhlIEpTWEVsZW1lbnQgaXRzZWxmXG5cbiAgICAgICAgICAgICAgaWYgKCFvcGVuaW5nTm9kZS5sb2MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjb25zdCBhbHJlYWR5SGFzSWQgPSBvcGVuaW5nTm9kZS5hdHRyaWJ1dGVzLnNvbWUoXG4gICAgICAgICAgICAgICAgKGF0dHIpID0+IHQuaXNKU1hBdHRyaWJ1dGUoYXR0cikgJiYgYXR0ci5uYW1lLm5hbWUgPT09ICdkYXRhLWVkaXQtaWQnXG4gICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgaWYgKGFscmVhZHlIYXNJZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIENvbmRpdGlvbiAxOiBJcyB0aGUgY3VycmVudCBlbGVtZW50IHRhZyB0eXBlIGVkaXRhYmxlP1xuICAgICAgICAgICAgICBjb25zdCBpc0N1cnJlbnRFbGVtZW50RWRpdGFibGUgPSBjaGVja1RhZ05hbWVFZGl0YWJsZShvcGVuaW5nTm9kZSwgRURJVEFCTEVfSFRNTF9UQUdTKTtcbiAgICAgICAgICAgICAgaWYgKCFpc0N1cnJlbnRFbGVtZW50RWRpdGFibGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBsZXQgc2hvdWxkQmVEaXNhYmxlZER1ZVRvQ2hpbGRyZW4gPSBmYWxzZTtcblxuICAgICAgICAgICAgICAvLyBDb25kaXRpb24gMjogRG9lcyB0aGUgZWxlbWVudCBoYXZlIGR5bmFtaWMgb3IgZWRpdGFibGUgY2hpbGRyZW5cbiAgICAgICAgICAgICAgaWYgKHQuaXNKU1hFbGVtZW50KGVsZW1lbnROb2RlKSAmJiBlbGVtZW50Tm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGVsZW1lbnQgaGFzIHsuLi5wcm9wc30gc3ByZWFkIGF0dHJpYnV0ZSAtIGRpc2FibGUgZWRpdGluZyBpZiBpdCBkb2VzXG4gICAgICAgICAgICAgICAgY29uc3QgaGFzUHJvcHNTcHJlYWQgPSBvcGVuaW5nTm9kZS5hdHRyaWJ1dGVzLnNvbWUoYXR0ciA9PiB0LmlzSlNYU3ByZWFkQXR0cmlidXRlKGF0dHIpIFxuICAgICAgICAgICAgICAgICYmIGF0dHIuYXJndW1lbnQgIFxuICAgICAgICAgICAgICAgICYmIHQuaXNJZGVudGlmaWVyKGF0dHIuYXJndW1lbnQpIFxuICAgICAgICAgICAgICAgICYmIGF0dHIuYXJndW1lbnQubmFtZSA9PT0gJ3Byb3BzJ1xuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBoYXNEeW5hbWljQ2hpbGQgPSBlbGVtZW50Tm9kZS5jaGlsZHJlbi5zb21lKGNoaWxkID0+XG4gICAgICAgICAgICAgICAgICB0LmlzSlNYRXhwcmVzc2lvbkNvbnRhaW5lcihjaGlsZClcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgaWYgKGhhc0R5bmFtaWNDaGlsZCB8fCBoYXNQcm9wc1NwcmVhZCkge1xuICAgICAgICAgICAgICAgICAgc2hvdWxkQmVEaXNhYmxlZER1ZVRvQ2hpbGRyZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmICghc2hvdWxkQmVEaXNhYmxlZER1ZVRvQ2hpbGRyZW4gJiYgdC5pc0pTWEVsZW1lbnQoZWxlbWVudE5vZGUpICYmIGVsZW1lbnROb2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFzRWRpdGFibGVKc3hDaGlsZCA9IGVsZW1lbnROb2RlLmNoaWxkcmVuLnNvbWUoY2hpbGQgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKHQuaXNKU1hFbGVtZW50KGNoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hlY2tUYWdOYW1lRWRpdGFibGUoY2hpbGQub3BlbmluZ0VsZW1lbnQsIEVESVRBQkxFX0hUTUxfVEFHUyk7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmIChoYXNFZGl0YWJsZUpzeENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICBzaG91bGRCZURpc2FibGVkRHVlVG9DaGlsZHJlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKHNob3VsZEJlRGlzYWJsZWREdWVUb0NoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlzYWJsZWRBdHRyaWJ1dGUgPSB0LmpzeEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgIHQuanN4SWRlbnRpZmllcignZGF0YS1lZGl0LWRpc2FibGVkJyksXG4gICAgICAgICAgICAgICAgICB0LnN0cmluZ0xpdGVyYWwoJ3RydWUnKVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBvcGVuaW5nTm9kZS5hdHRyaWJ1dGVzLnB1c2goZGlzYWJsZWRBdHRyaWJ1dGUpO1xuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXNBZGRlZCsrO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIENvbmRpdGlvbiAzOiBQYXJlbnQgaXMgbm9uLWVkaXRhYmxlIGlmIEFUIExFQVNUIE9ORSBjaGlsZCBKU1hFbGVtZW50IGlzIGEgbm9uLWVkaXRhYmxlIHR5cGUuXG4gICAgICAgICAgICAgIGlmICh0LmlzSlNYRWxlbWVudChlbGVtZW50Tm9kZSkgJiYgZWxlbWVudE5vZGUuY2hpbGRyZW4gJiYgZWxlbWVudE5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgbGV0IGhhc05vbkVkaXRhYmxlSnN4Q2hpbGQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZWxlbWVudE5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAodC5pc0pTWEVsZW1lbnQoY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2hlY2tUYWdOYW1lRWRpdGFibGUoY2hpbGQub3BlbmluZ0VsZW1lbnQsIEVESVRBQkxFX0hUTUxfVEFHUykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc05vbkVkaXRhYmxlSnN4Q2hpbGQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoaGFzTm9uRWRpdGFibGVKc3hDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc2FibGVkQXR0cmlidXRlID0gdC5qc3hBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICAgICB0LmpzeElkZW50aWZpZXIoJ2RhdGEtZWRpdC1kaXNhYmxlZCcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdC5zdHJpbmdMaXRlcmFsKFwidHJ1ZVwiKVxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgb3BlbmluZ05vZGUuYXR0cmlidXRlcy5wdXNoKGRpc2FibGVkQXR0cmlidXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzQWRkZWQrKztcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm47IFxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gQ29uZGl0aW9uIDQ6IElzIGFueSBhbmNlc3RvciBKU1hFbGVtZW50IGFsc28gZWRpdGFibGU/XG4gICAgICAgICAgICAgIGxldCBjdXJyZW50QW5jZXN0b3JDYW5kaWRhdGVQYXRoID0gcGF0aC5wYXJlbnRQYXRoLnBhcmVudFBhdGg7XG4gICAgICAgICAgICAgIHdoaWxlIChjdXJyZW50QW5jZXN0b3JDYW5kaWRhdGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCBhbmNlc3RvckpzeEVsZW1lbnRQYXRoID0gY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aC5pc0pTWEVsZW1lbnQoKVxuICAgICAgICAgICAgICAgICAgICAgID8gY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aFxuICAgICAgICAgICAgICAgICAgICAgIDogY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aC5maW5kUGFyZW50KHAgPT4gcC5pc0pTWEVsZW1lbnQoKSk7XG5cbiAgICAgICAgICAgICAgICAgIGlmICghYW5jZXN0b3JKc3hFbGVtZW50UGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoY2hlY2tUYWdOYW1lRWRpdGFibGUoYW5jZXN0b3JKc3hFbGVtZW50UGF0aC5ub2RlLm9wZW5pbmdFbGVtZW50LCBFRElUQUJMRV9IVE1MX1RBR1MpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aCA9IGFuY2VzdG9ySnN4RWxlbWVudFBhdGgucGFyZW50UGF0aDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgY29uc3QgbGluZSA9IG9wZW5pbmdOb2RlLmxvYy5zdGFydC5saW5lO1xuICAgICAgICAgICAgICBjb25zdCBjb2x1bW4gPSBvcGVuaW5nTm9kZS5sb2Muc3RhcnQuY29sdW1uICsgMTtcbiAgICAgICAgICAgICAgY29uc3QgZWRpdElkID0gYCR7d2ViUmVsYXRpdmVGaWxlUGF0aH06JHtsaW5lfToke2NvbHVtbn1gO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgY29uc3QgaWRBdHRyaWJ1dGUgPSB0LmpzeEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICB0LmpzeElkZW50aWZpZXIoJ2RhdGEtZWRpdC1pZCcpLFxuICAgICAgICAgICAgICAgIHQuc3RyaW5nTGl0ZXJhbChlZGl0SWQpXG4gICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgb3BlbmluZ05vZGUuYXR0cmlidXRlcy5wdXNoKGlkQXR0cmlidXRlKTtcbiAgICAgICAgICAgICAgYXR0cmlidXRlc0FkZGVkKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoYXR0cmlidXRlc0FkZGVkID4gMCkge1xuICAgICAgICAgIGNvbnN0IGdlbmVyYXRlRnVuY3Rpb24gPSBnZW5lcmF0ZS5kZWZhdWx0IHx8IGdlbmVyYXRlO1xuICAgICAgICAgIGNvbnN0IG91dHB1dCA9IGdlbmVyYXRlRnVuY3Rpb24oYmFiZWxBc3QsIHtcbiAgICAgICAgICAgIHNvdXJjZU1hcHM6IHRydWUsXG4gICAgICAgICAgICBzb3VyY2VGaWxlTmFtZTogd2ViUmVsYXRpdmVGaWxlUGF0aFxuICAgICAgICAgIH0sIGNvZGUpO1xuXG4gICAgICAgICAgcmV0dXJuIHsgY29kZTogb3V0cHV0LmNvZGUsIG1hcDogb3V0cHV0Lm1hcCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbdml0ZV1bdmlzdWFsLWVkaXRvcl0gRXJyb3IgdHJhbnNmb3JtaW5nICR7aWR9OmAsIGVycm9yKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfSxcblxuXG4gICAgLy8gVXBkYXRlcyBzb3VyY2UgY29kZSBiYXNlZCBvbiB0aGUgY2hhbmdlcyByZWNlaXZlZCBmcm9tIHRoZSBjbGllbnRcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL2FwcGx5LWVkaXQnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgIT09ICdQT1NUJykgcmV0dXJuIG5leHQoKTtcblxuICAgICAgICBsZXQgYm9keSA9ICcnO1xuICAgICAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiB7IGJvZHkgKz0gY2h1bmsudG9TdHJpbmcoKTsgfSk7XG5cbiAgICAgICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgbGV0IGFic29sdXRlRmlsZVBhdGggPSAnJztcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBlZGl0SWQsIG5ld0Z1bGxUZXh0IH0gPSBKU09OLnBhcnNlKGJvZHkpO1xuXG4gICAgICAgICAgICBpZiAoIWVkaXRJZCB8fCB0eXBlb2YgbmV3RnVsbFRleHQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIGVkaXRJZCBvciBuZXdGdWxsVGV4dCcgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBwYXJzZWRJZCA9IHBhcnNlRWRpdElkKGVkaXRJZCk7XG4gICAgICAgICAgICBpZiAoIXBhcnNlZElkKSB7XG4gICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIGVkaXRJZCBmb3JtYXQgKGZpbGVQYXRoOmxpbmU6Y29sdW1uKScgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB7IGZpbGVQYXRoLCBsaW5lLCBjb2x1bW4gfSA9IHBhcnNlZElkO1xuXG4gICAgICAgICAgICBhYnNvbHV0ZUZpbGVQYXRoID0gcGF0aC5yZXNvbHZlKFZJVEVfUFJPSkVDVF9ST09ULCBmaWxlUGF0aCk7XG4gICAgICAgICAgICBpZiAoZmlsZVBhdGguaW5jbHVkZXMoJy4uJykgfHwgIWFic29sdXRlRmlsZVBhdGguc3RhcnRzV2l0aChWSVRFX1BST0pFQ1RfUk9PVCkgfHwgYWJzb2x1dGVGaWxlUGF0aC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludmFsaWQgcGF0aCcgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbENvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoYWJzb2x1dGVGaWxlUGF0aCwgJ3V0Zi04Jyk7XG5cbiAgICAgICAgICAgIGNvbnN0IGJhYmVsQXN0ID0gcGFyc2Uob3JpZ2luYWxDb250ZW50LCB7XG4gICAgICAgICAgICAgIHNvdXJjZVR5cGU6ICdtb2R1bGUnLFxuICAgICAgICAgICAgICBwbHVnaW5zOiBbJ2pzeCcsICd0eXBlc2NyaXB0J10sXG4gICAgICAgICAgICAgIGVycm9yUmVjb3Zlcnk6IHRydWVcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBsZXQgdGFyZ2V0Tm9kZVBhdGggPSBudWxsO1xuICAgICAgICAgICAgY29uc3QgdmlzaXRvciA9IHtcbiAgICAgICAgICAgICAgSlNYT3BlbmluZ0VsZW1lbnQocGF0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBwYXRoLm5vZGU7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUubG9jICYmIG5vZGUubG9jLnN0YXJ0LmxpbmUgPT09IGxpbmUgJiYgbm9kZS5sb2Muc3RhcnQuY29sdW1uICsgMSA9PT0gY29sdW1uKSB7XG4gICAgICAgICAgICAgICAgICB0YXJnZXROb2RlUGF0aCA9IHBhdGg7XG4gICAgICAgICAgICAgICAgICBwYXRoLnN0b3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0cmF2ZXJzZUJhYmVsLmRlZmF1bHQoYmFiZWxBc3QsIHZpc2l0b3IpO1xuXG4gICAgICAgICAgICBpZiAoIXRhcmdldE5vZGVQYXRoKSB7XG4gICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDA0LCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdUYXJnZXQgbm9kZSBub3QgZm91bmQgYnkgbGluZS9jb2x1bW4nLCBlZGl0SWQgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBnZW5lcmF0ZUZ1bmN0aW9uID0gZ2VuZXJhdGUuZGVmYXVsdCB8fCBnZW5lcmF0ZTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmVudEVsZW1lbnROb2RlID0gdGFyZ2V0Tm9kZVBhdGgucGFyZW50UGF0aD8ubm9kZTtcbiAgICAgICAgICAgIGxldCBiZWZvcmVDb2RlID0gJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwYXJlbnRFbGVtZW50Tm9kZSAmJiB0LmlzSlNYRWxlbWVudChwYXJlbnRFbGVtZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgY29uc3QgYmVmb3JlT3V0cHV0ID0gZ2VuZXJhdGVGdW5jdGlvbihwYXJlbnRFbGVtZW50Tm9kZSwge30pO1xuICAgICAgICAgICAgICBiZWZvcmVDb2RlID0gYmVmb3JlT3V0cHV0LmNvZGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBtb2RpZmllZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZiAocGFyZW50RWxlbWVudE5vZGUgJiYgdC5pc0pTWEVsZW1lbnQocGFyZW50RWxlbWVudE5vZGUpKSB7XG4gICAgICAgICAgICAgIHBhcmVudEVsZW1lbnROb2RlLmNoaWxkcmVuID0gW107XG4gICAgICAgICAgICAgIGlmIChuZXdGdWxsVGV4dCAmJiBuZXdGdWxsVGV4dC50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VGV4dE5vZGUgPSB0LmpzeFRleHQobmV3RnVsbFRleHQpO1xuICAgICAgICAgICAgICAgIHBhcmVudEVsZW1lbnROb2RlLmNoaWxkcmVuLnB1c2gobmV3VGV4dE5vZGUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG1vZGlmaWVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFtb2RpZmllZCkge1xuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwOSwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnQ291bGQgbm90IGFwcGx5IGNoYW5nZXMgdG8gQVNULicgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgYWZ0ZXJDb2RlID0gJyc7XG4gICAgICAgICAgICBpZiAocGFyZW50RWxlbWVudE5vZGUgJiYgdC5pc0pTWEVsZW1lbnQocGFyZW50RWxlbWVudE5vZGUpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGFmdGVyT3V0cHV0ID0gZ2VuZXJhdGVGdW5jdGlvbihwYXJlbnRFbGVtZW50Tm9kZSwge30pO1xuICAgICAgICAgICAgICBhZnRlckNvZGUgPSBhZnRlck91dHB1dC5jb2RlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBvdXRwdXQgPSBnZW5lcmF0ZUZ1bmN0aW9uKGJhYmVsQXN0LCB7fSk7XG4gICAgICAgICAgICBjb25zdCBuZXdDb250ZW50ID0gb3V0cHV0LmNvZGU7XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgdGV4dCBmcm9tIGJlZm9yZUNvZGUgYW5kIGFmdGVyQ29kZSBmb3IgaGlzdG9yeVxuICAgICAgICAgICAgY29uc3QgZXh0cmFjdFRleHQgPSAoY29kZSkgPT4ge1xuICAgICAgICAgICAgICBpZiAoIWNvZGUpIHJldHVybiAnJztcbiAgICAgICAgICAgICAgLy8gU2ltcGxlIHRleHQgZXh0cmFjdGlvbiBmcm9tIEpTWFxuICAgICAgICAgICAgICBjb25zdCB0ZXh0TWF0Y2ggPSBjb2RlLm1hdGNoKC8+KC4qPyk8L3MpO1xuICAgICAgICAgICAgICByZXR1cm4gdGV4dE1hdGNoID8gdGV4dE1hdGNoWzFdLnRyaW0oKSA6ICcnO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgY29udGVudEJlZm9yZSA9IGV4dHJhY3RUZXh0KGJlZm9yZUNvZGUpO1xuICAgICAgICAgICAgY29uc3QgY29udGVudEFmdGVyID0gbmV3RnVsbFRleHQ7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoYWJzb2x1dGVGaWxlUGF0aCwgbmV3Q29udGVudCwgJ3V0Zi04Jyk7IFxuICAgICAgICAgICAgfSBjYXRjaCAod3JpdGVFcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBbdml0ZV1bdmlzdWFsLWVkaXRvcl0gRXJyb3IgZHVyaW5nIGRpcmVjdCB3cml0ZSBmb3IgJHtmaWxlUGF0aH06YCwgd3JpdGVFcnJvcik7XG4gICAgICAgICAgICAgIHRocm93IHdyaXRlRXJyb3I7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSwgXG4gICAgICAgICAgICAgICAgbmV3RmlsZUNvbnRlbnQ6IG5ld0NvbnRlbnQsXG4gICAgICAgICAgICAgICAgYmVmb3JlQ29kZSxcbiAgICAgICAgICAgICAgICBhZnRlckNvZGUsXG4gICAgICAgICAgICAgICAgLy8gSW5jbHVkZSBkYXRhIGZvciBoaXN0b3J5IHRyYWNraW5nXG4gICAgICAgICAgICAgICAgZWRpdERhdGE6IHtcbiAgICAgICAgICAgICAgICAgIGVkaXRJZCxcbiAgICAgICAgICAgICAgICAgIGZpbGVQYXRoLFxuICAgICAgICAgICAgICAgICAgbGluZSxcbiAgICAgICAgICAgICAgICAgIGNvbHVtbixcbiAgICAgICAgICAgICAgICAgIGNvbnRlbnRCZWZvcmUsXG4gICAgICAgICAgICAgICAgICBjb250ZW50QWZ0ZXJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvciBkdXJpbmcgZWRpdCBhcHBsaWNhdGlvbi4nIH0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSAiLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFsZXhiXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcQXBwXFxcXF9HaXRIdWJcXFxcZG9zbXVuZG9zXFxcXHBsdWdpbnNcXFxcdmlzdWFsLWVkaXRvclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcYWxleGJcXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxBcHBcXFxcX0dpdEh1YlxcXFxkb3NtdW5kb3NcXFxccGx1Z2luc1xcXFx2aXN1YWwtZWRpdG9yXFxcXHZpc3VhbC1lZGl0b3ItY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9hbGV4Yi9PbmVEcml2ZS9EZXNrdG9wL0FwcC9fR2l0SHViL2Rvc211bmRvcy9wbHVnaW5zL3Zpc3VhbC1lZGl0b3IvdmlzdWFsLWVkaXRvci1jb25maWcuanNcIjtleHBvcnQgY29uc3QgUE9QVVBfU1RZTEVTID0gYFxuI2lubGluZS1lZGl0b3ItcG9wdXAge1xuICB3aWR0aDogMzYwcHg7XG4gIHBvc2l0aW9uOiBmaXhlZDtcbiAgei1pbmRleDogMTAwMDA7XG4gIGJhY2tncm91bmQ6ICMxNjE3MTg7XG4gIGNvbG9yOiB3aGl0ZTtcbiAgYm9yZGVyOiAxcHggc29saWQgIzRhNTU2ODtcbiAgYm9yZGVyLXJhZGl1czogMTZweDtcbiAgcGFkZGluZzogOHB4O1xuICBib3gtc2hhZG93OiAwIDRweCAxMnB4IHJnYmEoMCwwLDAsMC4yKTtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgZ2FwOiAxMHB4O1xuICBkaXNwbGF5OiBub25lO1xufVxuXG5AbWVkaWEgKG1heC13aWR0aDogNzY4cHgpIHtcbiAgI2lubGluZS1lZGl0b3ItcG9wdXAge1xuICAgIHdpZHRoOiBjYWxjKDEwMCUgLSAyMHB4KTtcbiAgfVxufVxuXG4jaW5saW5lLWVkaXRvci1wb3B1cC5pcy1hY3RpdmUge1xuICBkaXNwbGF5OiBmbGV4O1xuICB0b3A6IDUwJTtcbiAgbGVmdDogNTAlO1xuICB0cmFuc2Zvcm06IHRyYW5zbGF0ZSgtNTAlLCAtNTAlKTtcbn1cblxuI2lubGluZS1lZGl0b3ItcG9wdXAuaXMtZGlzYWJsZWQtdmlldyB7XG4gIHBhZGRpbmc6IDEwcHggMTVweDtcbn1cblxuI2lubGluZS1lZGl0b3ItcG9wdXAgdGV4dGFyZWEge1xuICBoZWlnaHQ6IDEwMHB4O1xuICBwYWRkaW5nOiA0cHggOHB4O1xuICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcbiAgY29sb3I6IHdoaXRlO1xuICBmb250LWZhbWlseTogaW5oZXJpdDtcbiAgZm9udC1zaXplOiAwLjg3NXJlbTtcbiAgbGluZS1oZWlnaHQ6IDEuNDI7XG4gIHJlc2l6ZTogbm9uZTtcbiAgb3V0bGluZTogbm9uZTtcbn1cblxuI2lubGluZS1lZGl0b3ItcG9wdXAgLmJ1dHRvbi1jb250YWluZXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGZsZXgtZW5kO1xuICBnYXA6IDEwcHg7XG59XG5cbiNpbmxpbmUtZWRpdG9yLXBvcHVwIC5wb3B1cC1idXR0b24ge1xuICBib3JkZXI6IG5vbmU7XG4gIHBhZGRpbmc6IDZweCAxNnB4O1xuICBib3JkZXItcmFkaXVzOiA4cHg7XG4gIGN1cnNvcjogcG9pbnRlcjtcbiAgZm9udC1zaXplOiAwLjc1cmVtO1xuICBmb250LXdlaWdodDogNzAwO1xuICBoZWlnaHQ6IDM0cHg7XG4gIG91dGxpbmU6IG5vbmU7XG59XG5cbiNpbmxpbmUtZWRpdG9yLXBvcHVwIC5zYXZlLWJ1dHRvbiB7XG4gIGJhY2tncm91bmQ6ICM2NzNkZTY7XG4gIGNvbG9yOiB3aGl0ZTtcbn1cblxuI2lubGluZS1lZGl0b3ItcG9wdXAgLmNhbmNlbC1idXR0b24ge1xuICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcbiAgYm9yZGVyOiAxcHggc29saWQgIzNiM2Q0YTtcbiAgY29sb3I6IHdoaXRlO1xuXG4gICY6aG92ZXIge1xuICAgIGJhY2tncm91bmQ6IzQ3NDk1ODtcbiAgfVxufVxuYDtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBvcHVwSFRNTFRlbXBsYXRlKHNhdmVMYWJlbCwgY2FuY2VsTGFiZWwpIHtcbiAgcmV0dXJuIGBcbiAgICA8dGV4dGFyZWE+PC90ZXh0YXJlYT5cbiAgICA8ZGl2IGNsYXNzPVwiYnV0dG9uLWNvbnRhaW5lclwiPlxuICAgICAgPGJ1dHRvbiBjbGFzcz1cInBvcHVwLWJ1dHRvbiBjYW5jZWwtYnV0dG9uXCI+JHtjYW5jZWxMYWJlbH08L2J1dHRvbj5cbiAgICAgIDxidXR0b24gY2xhc3M9XCJwb3B1cC1idXR0b24gc2F2ZS1idXR0b25cIj4ke3NhdmVMYWJlbH08L2J1dHRvbj5cbiAgICA8L2Rpdj5cbiAgYDtcbn07XG5cbmV4cG9ydCBjb25zdCBFRElUX01PREVfU1RZTEVTID0gYFxuICAjcm9vdFtkYXRhLWVkaXQtbW9kZS1lbmFibGVkPVwidHJ1ZVwiXSBbZGF0YS1lZGl0LWlkXSB7XG4gICAgY3Vyc29yOiBwb2ludGVyOyBcbiAgICBvdXRsaW5lOiAxcHggZGFzaGVkICMzNTdERjk7IFxuICAgIG91dGxpbmUtb2Zmc2V0OiAycHg7XG4gICAgbWluLWhlaWdodDogMWVtO1xuICB9XG4gICNyb290W2RhdGEtZWRpdC1tb2RlLWVuYWJsZWQ9XCJ0cnVlXCJdIHtcbiAgICBjdXJzb3I6IHBvaW50ZXI7XG4gIH1cbiAgI3Jvb3RbZGF0YS1lZGl0LW1vZGUtZW5hYmxlZD1cInRydWVcIl0gW2RhdGEtZWRpdC1pZF06aG92ZXIge1xuICAgIGJhY2tncm91bmQtY29sb3I6ICMzNTdERjkzMztcbiAgICBvdXRsaW5lLWNvbG9yOiAjMzU3REY5OyBcbiAgfVxuXG4gIEBrZXlmcmFtZXMgZmFkZUluVG9vbHRpcCB7XG4gICAgZnJvbSB7XG4gICAgICBvcGFjaXR5OiAwO1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDVweCk7XG4gICAgfVxuICAgIHRvIHtcbiAgICAgIG9wYWNpdHk6IDE7XG4gICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMCk7XG4gICAgfVxuICB9XG5cbiAgI2lubGluZS1lZGl0b3ItZGlzYWJsZWQtdG9vbHRpcCB7XG4gICAgZGlzcGxheTogbm9uZTsgXG4gICAgb3BhY2l0eTogMDsgXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIGJhY2tncm91bmQtY29sb3I6ICMxRDFEMjA7XG4gICAgY29sb3I6IHdoaXRlO1xuICAgIHBhZGRpbmc6IDRweCA4cHg7XG4gICAgYm9yZGVyLXJhZGl1czogOHB4O1xuICAgIHotaW5kZXg6IDEwMDAxO1xuICAgIGZvbnQtc2l6ZTogMTRweDtcbiAgICBib3JkZXI6IDFweCBzb2xpZCAjM0IzRDRBO1xuICAgIG1heC13aWR0aDogMTg0cHg7XG4gICAgdGV4dC1hbGlnbjogY2VudGVyO1xuICB9XG5cbiAgI2lubGluZS1lZGl0b3ItZGlzYWJsZWQtdG9vbHRpcC50b29sdGlwLWFjdGl2ZSB7XG4gICAgZGlzcGxheTogYmxvY2s7XG4gICAgYW5pbWF0aW9uOiBmYWRlSW5Ub29sdGlwIDAuMnMgZWFzZS1vdXQgZm9yd2FyZHM7XG4gIH1cbmA7IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhbGV4YlxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXEFwcFxcXFxfR2l0SHViXFxcXGRvc211bmRvc1xcXFxwbHVnaW5zXFxcXHZpc3VhbC1lZGl0b3JcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFsZXhiXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcQXBwXFxcXF9HaXRIdWJcXFxcZG9zbXVuZG9zXFxcXHBsdWdpbnNcXFxcdmlzdWFsLWVkaXRvclxcXFx2aXRlLXBsdWdpbi1lZGl0LW1vZGUuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2FsZXhiL09uZURyaXZlL0Rlc2t0b3AvQXBwL19HaXRIdWIvZG9zbXVuZG9zL3BsdWdpbnMvdmlzdWFsLWVkaXRvci92aXRlLXBsdWdpbi1lZGl0LW1vZGUuanNcIjtpbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcbmltcG9ydCB7IEVESVRfTU9ERV9TVFlMRVMgfSBmcm9tICcuL3Zpc3VhbC1lZGl0b3ItY29uZmlnJztcblxuY29uc3QgX19maWxlbmFtZSA9IGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKTtcbmNvbnN0IF9fZGlybmFtZSA9IHJlc29sdmUoX19maWxlbmFtZSwgJy4uJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGlubGluZUVkaXREZXZQbHVnaW4oKSB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ3ZpdGU6aW5saW5lLWVkaXQtZGV2JyxcbiAgICBhcHBseTogJ3NlcnZlJyxcbiAgICB0cmFuc2Zvcm1JbmRleEh0bWwoKSB7XG4gICAgICBjb25zdCBzY3JpcHRQYXRoID0gcmVzb2x2ZShfX2Rpcm5hbWUsICdlZGl0LW1vZGUtc2NyaXB0LmpzJyk7XG4gICAgICBjb25zdCBzY3JpcHRDb250ZW50ID0gcmVhZEZpbGVTeW5jKHNjcmlwdFBhdGgsICd1dGYtOCcpO1xuXG4gICAgICByZXR1cm4gW1xuICAgICAgICB7XG4gICAgICAgICAgdGFnOiAnc2NyaXB0JyxcbiAgICAgICAgICBhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBzY3JpcHRDb250ZW50LFxuICAgICAgICAgIGluamVjdFRvOiAnYm9keSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHRhZzogJ3N0eWxlJyxcbiAgICAgICAgICBjaGlsZHJlbjogRURJVF9NT0RFX1NUWUxFUyxcbiAgICAgICAgICBpbmplY3RUbzogJ2hlYWQnXG4gICAgICAgIH1cbiAgICAgIF07XG4gICAgfVxuICB9O1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhbGV4YlxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXEFwcFxcXFxfR2l0SHViXFxcXGRvc211bmRvc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcYWxleGJcXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxBcHBcXFxcX0dpdEh1YlxcXFxkb3NtdW5kb3NcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2FsZXhiL09uZURyaXZlL0Rlc2t0b3AvQXBwL19HaXRIdWIvZG9zbXVuZG9zL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyLCBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuXHJcbmNvbnN0IGlzRGV2ID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJztcclxubGV0IGlubGluZUVkaXRQbHVnaW4sIGVkaXRNb2RlRGV2UGx1Z2luO1xyXG5cclxuaWYgKGlzRGV2KSB7XHJcblx0aW5saW5lRWRpdFBsdWdpbiA9IChhd2FpdCBpbXBvcnQoJy4vcGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanMnKSkuZGVmYXVsdDtcclxuXHRlZGl0TW9kZURldlBsdWdpbiA9IChhd2FpdCBpbXBvcnQoJy4vcGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLWVkaXQtbW9kZS5qcycpKS5kZWZhdWx0O1xyXG59XHJcblxyXG5jb25zdCBjb25maWdIb3Jpem9uc1ZpdGVFcnJvckhhbmRsZXIgPSBgXHJcbmNvbnN0IG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKG11dGF0aW9ucykgPT4ge1xyXG5cdGZvciAoY29uc3QgbXV0YXRpb24gb2YgbXV0YXRpb25zKSB7XHJcblx0XHRmb3IgKGNvbnN0IGFkZGVkTm9kZSBvZiBtdXRhdGlvbi5hZGRlZE5vZGVzKSB7XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRhZGRlZE5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFICYmXHJcblx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0YWRkZWROb2RlLnRhZ05hbWU/LnRvTG93ZXJDYXNlKCkgPT09ICd2aXRlLWVycm9yLW92ZXJsYXknIHx8XHJcblx0XHRcdFx0XHRhZGRlZE5vZGUuY2xhc3NMaXN0Py5jb250YWlucygnYmFja2Ryb3AnKVxyXG5cdFx0XHRcdClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0aGFuZGxlVml0ZU92ZXJsYXkoYWRkZWROb2RlKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcblxyXG5vYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwge1xyXG5cdGNoaWxkTGlzdDogdHJ1ZSxcclxuXHRzdWJ0cmVlOiB0cnVlXHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gaGFuZGxlVml0ZU92ZXJsYXkobm9kZSkge1xyXG5cdGlmICghbm9kZS5zaGFkb3dSb290KSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRjb25zdCBiYWNrZHJvcCA9IG5vZGUuc2hhZG93Um9vdC5xdWVyeVNlbGVjdG9yKCcuYmFja2Ryb3AnKTtcclxuXHJcblx0aWYgKGJhY2tkcm9wKSB7XHJcblx0XHRjb25zdCBvdmVybGF5SHRtbCA9IGJhY2tkcm9wLm91dGVySFRNTDtcclxuXHRcdGNvbnN0IHBhcnNlciA9IG5ldyBET01QYXJzZXIoKTtcclxuXHRcdGNvbnN0IGRvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcob3ZlcmxheUh0bWwsICd0ZXh0L2h0bWwnKTtcclxuXHRcdGNvbnN0IG1lc3NhZ2VCb2R5RWxlbWVudCA9IGRvYy5xdWVyeVNlbGVjdG9yKCcubWVzc2FnZS1ib2R5Jyk7XHJcblx0XHRjb25zdCBmaWxlRWxlbWVudCA9IGRvYy5xdWVyeVNlbGVjdG9yKCcuZmlsZScpO1xyXG5cdFx0Y29uc3QgbWVzc2FnZVRleHQgPSBtZXNzYWdlQm9keUVsZW1lbnQgPyBtZXNzYWdlQm9keUVsZW1lbnQudGV4dENvbnRlbnQudHJpbSgpIDogJyc7XHJcblx0XHRjb25zdCBmaWxlVGV4dCA9IGZpbGVFbGVtZW50ID8gZmlsZUVsZW1lbnQudGV4dENvbnRlbnQudHJpbSgpIDogJyc7XHJcblx0XHRjb25zdCBlcnJvciA9IG1lc3NhZ2VUZXh0ICsgKGZpbGVUZXh0ID8gJyBGaWxlOicgKyBmaWxlVGV4dCA6ICcnKTtcclxuXHJcblx0XHR3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcclxuXHRcdFx0dHlwZTogJ2hvcml6b25zLXZpdGUtZXJyb3InLFxyXG5cdFx0XHRlcnJvcixcclxuXHRcdH0sICcqJyk7XHJcblx0fVxyXG59XHJcbmA7XHJcblxyXG5jb25zdCBjb25maWdIb3Jpem9uc1J1bnRpbWVFcnJvckhhbmRsZXIgPSBgXHJcbndpbmRvdy5vbmVycm9yID0gKG1lc3NhZ2UsIHNvdXJjZSwgbGluZW5vLCBjb2xubywgZXJyb3JPYmopID0+IHtcclxuXHRjb25zdCBlcnJvckRldGFpbHMgPSBlcnJvck9iaiA/IEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdG5hbWU6IGVycm9yT2JqLm5hbWUsXHJcblx0XHRtZXNzYWdlOiBlcnJvck9iai5tZXNzYWdlLFxyXG5cdFx0c3RhY2s6IGVycm9yT2JqLnN0YWNrLFxyXG5cdFx0c291cmNlLFxyXG5cdFx0bGluZW5vLFxyXG5cdFx0Y29sbm8sXHJcblx0fSkgOiBudWxsO1xyXG5cclxuXHR3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcclxuXHRcdHR5cGU6ICdob3Jpem9ucy1ydW50aW1lLWVycm9yJyxcclxuXHRcdG1lc3NhZ2UsXHJcblx0XHRlcnJvcjogZXJyb3JEZXRhaWxzXHJcblx0fSwgJyonKTtcclxufTtcclxuYDtcclxuXHJcbmNvbnN0IGNvbmZpZ0hvcml6b25zQ29uc29sZUVycnJvSGFuZGxlciA9IGBcclxuY29uc3Qgb3JpZ2luYWxDb25zb2xlRXJyb3IgPSBjb25zb2xlLmVycm9yO1xyXG5jb25zb2xlLmVycm9yID0gZnVuY3Rpb24oLi4uYXJncykge1xyXG5cdG9yaWdpbmFsQ29uc29sZUVycm9yLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xyXG5cclxuXHRsZXQgZXJyb3JTdHJpbmcgPSAnJztcclxuXHJcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRjb25zdCBhcmcgPSBhcmdzW2ldO1xyXG5cdFx0aWYgKGFyZyBpbnN0YW5jZW9mIEVycm9yKSB7XHJcblx0XHRcdGVycm9yU3RyaW5nID0gYXJnLnN0YWNrIHx8IFxcYFxcJHthcmcubmFtZX06IFxcJHthcmcubWVzc2FnZX1cXGA7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0aWYgKCFlcnJvclN0cmluZykge1xyXG5cdFx0ZXJyb3JTdHJpbmcgPSBhcmdzLm1hcChhcmcgPT4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeShhcmcpIDogU3RyaW5nKGFyZykpLmpvaW4oJyAnKTtcclxuXHR9XHJcblxyXG5cdHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe1xyXG5cdFx0dHlwZTogJ2hvcml6b25zLWNvbnNvbGUtZXJyb3InLFxyXG5cdFx0ZXJyb3I6IGVycm9yU3RyaW5nXHJcblx0fSwgJyonKTtcclxufTtcclxuYDtcclxuXHJcbmNvbnN0IGNvbmZpZ1dpbmRvd0ZldGNoTW9ua2V5UGF0Y2ggPSBgXHJcbmNvbnN0IG9yaWdpbmFsRmV0Y2ggPSB3aW5kb3cuZmV0Y2g7XHJcblxyXG53aW5kb3cuZmV0Y2ggPSBmdW5jdGlvbiguLi5hcmdzKSB7XHJcblx0Y29uc3QgdXJsID0gYXJnc1swXSBpbnN0YW5jZW9mIFJlcXVlc3QgPyBhcmdzWzBdLnVybCA6IGFyZ3NbMF07XHJcblxyXG5cdC8vIFNraXAgV2ViU29ja2V0IFVSTHNcclxuXHRpZiAodXJsLnN0YXJ0c1dpdGgoJ3dzOicpIHx8IHVybC5zdGFydHNXaXRoKCd3c3M6JykpIHtcclxuXHRcdHJldHVybiBvcmlnaW5hbEZldGNoLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIG9yaWdpbmFsRmV0Y2guYXBwbHkodGhpcywgYXJncylcclxuXHRcdC50aGVuKGFzeW5jIHJlc3BvbnNlID0+IHtcclxuXHRcdFx0Y29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykgfHwgJyc7XHJcblxyXG5cdFx0XHQvLyBFeGNsdWRlIEhUTUwgZG9jdW1lbnQgcmVzcG9uc2VzXHJcblx0XHRcdGNvbnN0IGlzRG9jdW1lbnRSZXNwb25zZSA9XHJcblx0XHRcdFx0Y29udGVudFR5cGUuaW5jbHVkZXMoJ3RleHQvaHRtbCcpIHx8XHJcblx0XHRcdFx0Y29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL3hodG1sK3htbCcpO1xyXG5cclxuXHRcdFx0Ly8gU2lsZW5jZSBleHBlY3RlZCBub24tT0sgcmVzcG9uc2VzIGZvciBsaWdodHdlaWdodCBwcm9iZSBlbmRwb2ludHNcclxuXHRcdFx0Ly8gRXhhbXBsZTogL2FwaS91cGxvYWQvaW5mby86ZmlsZW5hbWUgcmV0dXJucyA0MDQgd2hlbiBhIGZpbGUgZG9lc24ndCBleGlzdCAodGhpcyBpcyBPSylcclxuXHRcdFx0Y29uc3QgcmVxdWVzdFVybCA9IHJlc3BvbnNlLnVybDtcclxuXHRcdFx0Y29uc3Qgc2hvdWxkU2lsZW5jZSA9XHJcblx0XHRcdFx0dHlwZW9mIHJlcXVlc3RVcmwgPT09ICdzdHJpbmcnICYmXHJcblx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0cmVxdWVzdFVybC5pbmNsdWRlcygnL2FwaS91cGxvYWQvaW5mby8nKSB8fFxyXG5cdFx0XHRcdFx0cmVxdWVzdFVybC5pbmNsdWRlcygnL2FwaS9hc3NlbWJseWFpL3N0YXR1cycpXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdGlmICghcmVzcG9uc2Uub2sgJiYgIWlzRG9jdW1lbnRSZXNwb25zZSAmJiAhc2hvdWxkU2lsZW5jZSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgcmVzcG9uc2VDbG9uZSA9IHJlc3BvbnNlLmNsb25lKCk7XHJcblx0XHRcdFx0XHRjb25zdCBlcnJvckZyb21SZXMgPSBhd2FpdCByZXNwb25zZUNsb25lLnRleHQoKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXFxgRmV0Y2ggZXJyb3IgZnJvbSBcXCR7cmVxdWVzdFVybH06IFxcJHtlcnJvckZyb21SZXN9XFxgKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHJlc3BvbnNlO1xyXG5cdFx0fSlcclxuXHRcdC5jYXRjaChlcnJvciA9PiB7XHJcblx0XHRcdGlmICghdXJsLm1hdGNoKC9cXFxcLmh0bWw/JC9pKSkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aHJvdyBlcnJvcjtcclxuXHRcdH0pO1xyXG59O1xyXG5gO1xyXG5cclxuY29uc3QgYWRkVHJhbnNmb3JtSW5kZXhIdG1sID0ge1xyXG5cdG5hbWU6ICdhZGQtdHJhbnNmb3JtLWluZGV4LWh0bWwnLFxyXG5cdHRyYW5zZm9ybUluZGV4SHRtbChodG1sKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRodG1sLFxyXG5cdFx0XHR0YWdzOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGFnOiAnc2NyaXB0JyxcclxuXHRcdFx0XHRcdGF0dHJzOiB7IHR5cGU6ICdtb2R1bGUnIH0sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogY29uZmlnSG9yaXpvbnNSdW50aW1lRXJyb3JIYW5kbGVyLFxyXG5cdFx0XHRcdFx0aW5qZWN0VG86ICdoZWFkJyxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRhZzogJ3NjcmlwdCcsXHJcblx0XHRcdFx0XHRhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IGNvbmZpZ0hvcml6b25zVml0ZUVycm9ySGFuZGxlcixcclxuXHRcdFx0XHRcdGluamVjdFRvOiAnaGVhZCcsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6ICdzY3JpcHQnLFxyXG5cdFx0XHRcdFx0YXR0cnM6IHt0eXBlOiAnbW9kdWxlJ30sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogY29uZmlnSG9yaXpvbnNDb25zb2xlRXJycm9IYW5kbGVyLFxyXG5cdFx0XHRcdFx0aW5qZWN0VG86ICdoZWFkJyxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRhZzogJ3NjcmlwdCcsXHJcblx0XHRcdFx0XHRhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IGNvbmZpZ1dpbmRvd0ZldGNoTW9ua2V5UGF0Y2gsXHJcblx0XHRcdFx0XHRpbmplY3RUbzogJ2hlYWQnLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdF0sXHJcblx0XHR9O1xyXG5cdH0sXHJcbn07XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoKVxyXG5jb25zdCBsb2dnZXJFcnJvciA9IGxvZ2dlci5lcnJvclxyXG5cclxuaWYgKGlzRGV2KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IgPSAobXNnLCBvcHRpb25zKSA9PiB7XHJcbiAgICAgICAgaWYgKG9wdGlvbnM/LmVycm9yPy50b1N0cmluZygpLmluY2x1ZGVzKCdDc3NTeW50YXhFcnJvcjogW3Bvc3Rjc3NdJykpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9nZ2VyRXJyb3IobXNnLCBvcHRpb25zKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gRW5hYmxlIGVycm9yL2NvbnNvbGUgb3ZlcmxheSBpbmplY3Rpb24gb25seSBmb3IgZGV2ZWxvcG1lbnQgb3Igd2hlbiBleHBsaWNpdGx5IHJlcXVlc3RlZFxyXG5jb25zdCBlbmFibGVEZWJ1Z092ZXJsYXlzID0gaXNEZXYgfHwgcHJvY2Vzcy5lbnYuVklURV9ERUJVR19PVkVSTEFZUyA9PT0gJ3RydWUnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuXHRjdXN0b21Mb2dnZXI6IGxvZ2dlcixcclxuXHRwbHVnaW5zOiBbXHJcblx0XHQuLi4oaXNEZXYgPyBbaW5saW5lRWRpdFBsdWdpbigpLCBlZGl0TW9kZURldlBsdWdpbigpXSA6IFtdKSxcclxuXHRcdHJlYWN0KCksXHJcbiAgICAgICAgLi4uKGVuYWJsZURlYnVnT3ZlcmxheXMgPyBbYWRkVHJhbnNmb3JtSW5kZXhIdG1sXSA6IFtdKVxyXG5cdF0sXHJcblx0c2VydmVyOiB7XHJcblx0XHRjb3JzOiB7XHJcblx0XHRcdG9yaWdpbjogdHJ1ZSxcclxuXHRcdFx0Y3JlZGVudGlhbHM6IHRydWUsXHJcblx0XHRcdG1ldGhvZHM6IFsnR0VUJywgJ1BPU1QnLCAnUFVUJywgJ0RFTEVURScsICdPUFRJT05TJ10sXHJcblx0XHRcdGFsbG93ZWRIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJywgJ1JhbmdlJywgJ0FjY2VwdC1SYW5nZXMnLCAnQ29udGVudC1SYW5nZSddXHJcblx0XHR9LFxyXG5cdFx0aGVhZGVyczoge1xyXG5cdFx0XHQnQ3Jvc3MtT3JpZ2luLUVtYmVkZGVyLVBvbGljeSc6ICdjcmVkZW50aWFsbGVzcycsXHJcblx0XHR9LFxyXG5cdFx0YWxsb3dlZEhvc3RzOiB0cnVlLFxyXG5cdFx0cHJveHk6IHtcclxuXHRcdFx0Jy9hcGknOiB7XHJcblx0XHRcdFx0Ly8gUm91dGUgZGV2IHJlcXVlc3RzIHRvIGxvY2FsIGJhY2tlbmQgb3IgVlBTIGRlcGVuZGluZyBvbiBlbnZcclxuXHRcdFx0XHQvLyBFeGFtcGxlIHRvIHVzZSBWUFM6IHNldCBWSVRFX0RFVl9BUElfUFJPWFlfVEFSR0VUPWh0dHBzOi8veW91ci12cHMtaG9zdFxyXG5cdFx0XHRcdHRhcmdldDogcHJvY2Vzcy5lbnYuVklURV9ERVZfQVBJX1BST1hZX1RBUkdFVCB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcclxuXHRcdFx0XHRjaGFuZ2VPcmlnaW46IHRydWUsXHJcblx0XHRcdFx0c2VjdXJlOiBmYWxzZVxyXG5cdFx0XHR9LFxyXG5cdFx0XHQnL3N1cGFiYXNlLXJlc3QnOiB7XHJcblx0XHRcdFx0dGFyZ2V0OiAnaHR0cHM6Ly9zdXBhYmFzZS5kb3NtdW5kb3MucGUnLFxyXG5cdFx0XHRcdGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuXHRcdFx0XHRzZWN1cmU6IHRydWUsXHJcblx0XHRcdFx0Y29uZmlndXJlOiAocHJveHksIG9wdGlvbnMpID0+IHtcclxuXHRcdFx0XHRcdHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcSwgcmVxLCByZXMpID0+IHtcclxuXHRcdFx0XHRcdFx0cmVxLmhlYWRlcnMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdHByb3h5UmVxLnNldEhlYWRlcihrZXksIHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdC8vIEFkZCBDT1JTIGhlYWRlcnNcclxuXHRcdFx0XHRcdFx0cHJveHlSZXEuc2V0SGVhZGVyKCdPcmlnaW4nLCAnaHR0cDovL2xvY2FsaG9zdDo1MTczJyk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdHByb3h5Lm9uKCdwcm94eVJlcycsIChwcm94eVJlcywgcmVxLCByZXMpID0+IHtcclxuXHRcdFx0XHRcdFx0cHJveHlSZXMuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJ10gPSAnKic7XHJcblx0XHRcdFx0XHRcdHByb3h5UmVzLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnXSA9ICdHRVQsUE9TVCxQVVQsREVMRVRFLE9QVElPTlMsUEFUQ0gnO1xyXG5cdFx0XHRcdFx0XHRwcm94eVJlcy5oZWFkZXJzWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJ10gPSAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uLCBSYW5nZSwgQWNjZXB0LVJhbmdlcywgQ29udGVudC1SYW5nZSwgYXBpa2V5JztcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0cHJveHkub24oJ2Vycm9yJywgKGVyciwgcmVxLCByZXMpID0+IHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcignU3VwYWJhc2UgcHJveHkgZXJyb3I6JywgZXJyKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0cmVzb2x2ZToge1xyXG5cdFx0ZXh0ZW5zaW9uczogWycuanN4JywgJy5qcycsICcudHN4JywgJy50cycsICcuanNvbicsIF0sXHJcblx0XHRhbGlhczoge1xyXG5cdFx0XHQnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxyXG5cdFx0fSxcclxuXHR9LFxyXG5cdGJ1aWxkOiB7XHJcblx0XHRtaW5pZnk6ICd0ZXJzZXInLFxyXG5cdFx0dGVyc2VyT3B0aW9uczoge1xyXG5cdFx0XHRjb21wcmVzczoge1xyXG5cdFx0XHRcdGRyb3BfY29uc29sZTogIWlzRGV2LFxyXG5cdFx0XHRcdGRyb3BfZGVidWdnZXI6ICFpc0RldixcclxuXHRcdFx0fSxcclxuXHRcdFx0Zm9ybWF0OiB7XHJcblx0XHRcdFx0Y29tbWVudHM6IGZhbHNlLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSxcclxuXHRcdHJvbGx1cE9wdGlvbnM6IHtcclxuXHRcdFx0ZXh0ZXJuYWw6IFtcclxuXHRcdFx0XHQnQGJhYmVsL3BhcnNlcicsXHJcblx0XHRcdFx0J0BiYWJlbC90cmF2ZXJzZScsXHJcblx0XHRcdFx0J0BiYWJlbC9nZW5lcmF0b3InLFxyXG5cdFx0XHRcdCdAYmFiZWwvdHlwZXMnXHJcblx0XHRcdF1cclxuXHRcdH0sXHJcblx0XHRvdXREaXI6ICdkaXN0J1xyXG5cdH0sXHJcblx0dGVzdDoge1xyXG5cdFx0Z2xvYmFsczogdHJ1ZSxcclxuXHRcdGVudmlyb25tZW50OiAnanNkb20nLFxyXG5cdFx0c2V0dXBGaWxlczogJy4vc3JjL3Rlc3Qvc2V0dXAuanMnXHJcblx0fVxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUErYyxPQUFPLFVBQVU7QUFDaGUsU0FBUyxxQkFBcUI7QUFDOUIsU0FBUyxhQUFhO0FBQ3RCLE9BQU8sbUJB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QVMsUUFBUSw4QkFBOEIsSUFBSTtBQUFBLFVBQ3BELENBQUM7QUFDRCxnQkFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLEtBQUssUUFBUTtBQUNwQyxvQkFBUSxNQUFNLHlCQUF5QixHQUFHO0FBQUEsVUFDM0MsQ0FBQztBQUFBLFFBQ0Y7QUFBQSxNQUNEO0FBQUEsSUFDRDtBQUFBLEVBQ0Q7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNSLFlBQVksQ0FBQyxRQUFRLE9BQU8sUUFBUSxPQUFPLE9BQVM7QUFBQSxJQUNwRCxPQUFPO0FBQUEsTUFDTixLQUFLQyxNQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3JDO0FBQUEsRUFDRDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ04sUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ2QsVUFBVTtBQUFBLFFBQ1QsY0FBYyxDQUFDO0FBQUEsUUFDZixlQUFlLENBQUM7QUFBQSxNQUNqQjtBQUFBLE1BQ0EsUUFBUTtBQUFBLFFBQ1AsVUFBVTtBQUFBLE1BQ1g7QUFBQSxJQUNEO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDZCxVQUFVO0FBQUEsUUFDVDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Q7QUFBQSxJQUNEO0FBQUEsSUFDQSxRQUFRO0FBQUEsRUFDVDtBQUFBLEVBQ0EsTUFBTTtBQUFBLElBQ0wsU0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsWUFBWTtBQUFBLEVBQ2I7QUFDRCxDQUFDOyIsCiAgIm5hbWVzIjogWyJwYXRoIiwgIl9fZGlybmFtZSIsICJmaWxlVVJMVG9QYXRoIiwgIl9fZGlybmFtZSIsICJfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsIiwgIl9fZmlsZW5hbWUiLCAicGF0aCIsICJpbmxpbmVFZGl0UGx1Z2luIiwgInBhdGgiXQp9Cg==

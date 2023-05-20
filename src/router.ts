import type { Express, Router } from "express"
import path from "path"

import type { Options } from "./types"

import config from "./config"

import { generateRoutes, walkTree } from "./lib"
import { getHandlers, getMethodKey } from "./utils"

const cjsMainFilename = typeof require !== "undefined" && require.main?.filename
const REQUIRE_MAIN_FILE = path.dirname(cjsMainFilename || process.cwd())

type ExpressLike = Express | Router

type ExpressLike = Express | Router

/**
 * Attach routes to an Express app or router instance
 *
 * ```ts
 * await createRouter(app)
 * ```
 *
 * @param app An express app or router instance
 * @param options An options object (optional)
 */
const createRouter = async <T extends ExpressLike = ExpressLike>(
  app: T,
  options: Options = {}
): Promise<T> => {
  const files = walkTree(
    options.directory || path.join(REQUIRE_MAIN_FILE, "routes")
  )

  const routes = await generateRoutes(files)

  for (const { url, exports } of routes) {
    const exportedMethods = Object.entries(exports)

    for (const [method, handler] of exportedMethods) {
      const methodKey = getMethodKey(method)
      const handlers = getHandlers(handler)

      if (
        !options.additionalMethods?.includes(methodKey) &&
        !config.DEFAULT_METHOD_EXPORTS.includes(methodKey)
      )
        continue

      app[methodKey](url, ...handlers)
    }

    // wildcard default export route matching
    if (typeof exports.default !== "undefined") {
      app.all.apply(null, [url, ...getHandlers(exports.default)])
      app.all.apply(app, [url, ...getHandlers(exports.default)])
    }
  }

  return app
}

export default createRouter

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { allTags, getDiff } from "./github.js";

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.pathname === '/api/tags') {
			const cacheKey = new Request(url.toString(), request);
			const cache = caches.default;
			let response = await cache.match(cacheKey);

			if (!response) {
				let json = await allTags('laravel/laravel');

				response = new Response(JSON.stringify(json));

				response.headers.set('Cache-Control', 'public, max-age=3600');
				response.headers.set('Content-Type', 'application/json');
				response.headers.set('Access-Control-Allow-Origin', '*');
				response.headers.set('Access-Control-Allow-Methods', 'GET');

				// Put the response in the cache
				ctx.waitUntil(cache.put(cacheKey, response.clone()));
			}

			return response;
		}

		// api/patch?source=v11.0.0&target=v12.0.0
		if (url.pathname === '/api/diff') {
			const sourceVersion = url.searchParams.get('source');
			const targetVersion = url.searchParams.get('target');

			if (!sourceVersion && !targetVersion) {
				return new Response('Missing source or target query parameter', {
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Headers': 'GET, POST'
					},
					status: 400
				});
			}

			const cacheKey = new Request(url.toString(), request);
			const cache = caches.default;
			let response = await cache.match(cacheKey);

			if (!response) {
				try {
					let json = await getDiff('laravel/laravel', sourceVersion, targetVersion);

					response = new Response(JSON.stringify(json), {
						headers: {
							'Cache-Control': 'public, max-age=3600',
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
							'Access-Control-Allow-Headers': 'GET, POST'
						}
					});

					// Put the response in the cache
					ctx.waitUntil(cache.put(cacheKey, response.clone()));
				} catch (error) {
					response = new Response(JSON.stringify({ "message": error.message }), {
						headers: {
							'Cache-Control': 'public, max-age=3600',
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
							'Access-Control-Allow-Headers': 'GET, POST'
						},
						status: 404
					});

					// Put the response in the cache
					ctx.waitUntil(cache.put(cacheKey, response.clone()));
				}
			}

			return response;
		}

		return new Response('Hello World!');
	},
};

/* API Manager */
(function() {
  "use strict";

  const app = window.AnimeFlix || {};
  window.AnimeFlix = app;

  const BASE_URL = 'https://api.jikan.moe/v4';
  
  // Request Queue
  let isRequesting = false;
  const requestQueue = [];

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function processQueue() {
    if (isRequesting || requestQueue.length === 0) return;
    
    isRequesting = true;
    const { url, options, retries, resolve, reject } = requestQueue.shift();

    try {
      const result = await executeRequest(url, options, retries);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      // Wait 300ms before next request for rate limit
      await sleep(300);
      isRequesting = false;
      processQueue();
    }
  }

  async function executeRequest(url, options, retriesLeft) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        if (retriesLeft > 0) {
          console.warn(`429 Rate Limit. Retrying in 1.5s... (${retriesLeft} retries left)`);
          await sleep(1500);
          return await executeRequest(url, options, retriesLeft - 1);
        } else {
          throw new Error("API Rate Limit Exceeded (429)");
        }
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      if (retriesLeft > 0 && !error.message.includes('429')) {
        await sleep(1000);
        return await executeRequest(url, options, retriesLeft - 1);
      }
      throw error;
    }
  }

  function fetchApi(endpoint, params = {}, options = {}) {
    return new Promise((resolve, reject) => {
      let url = `${BASE_URL}${endpoint}`;
      
      if (Object.keys(params).length > 0) {
        const urlParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null && value !== '') {
            urlParams.append(key, value);
          }
        }
        url += `?${urlParams.toString()}`;
      }

      requestQueue.push({
        url,
        options: {
          signal: options.signal,
          method: 'GET'
        },
        retries: 3,
        resolve,
        reject
      });

      processQueue();
    });
  }

  app.api = {
    fetch: fetchApi
  };
  
  // Map old function name to new one to avoid breaking other files immediately
  app.fetchAnime = (endpoint, params, options) => fetchApi(endpoint, params, options);

})();

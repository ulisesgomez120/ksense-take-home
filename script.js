// normally in a .env or config file
const API_KEY = "ak_2af42db29d93ec7c8e292adc7aa6e3bb820e8100c390dc0a";
const BASE_URL = "https://assessment.ksensetech.com/api";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      // Throw an error for non-successful status codes
      throw new Error(`Request failed with status ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    if (retries > 0) {
      console.warn(`Request failed. Retrying in ${RETRY_DELAY_MS / 1000}s... (${retries} retries left)`);
      // Wait for a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return fetchWithRetry(url, options, retries - 1);
    } else {
      // If all retries fail, re-throw the last error
      console.error("All retries failed.");
      throw err;
    }
  }
}

async function getAllPatients() {
  let allPatients = [];
  let page = 1;
  let hasNextPage = true;
  const fetchOptions = {
    method: "GET",
    headers: { "x-api-key": API_KEY },
  };

  console.log("Starting to fetch patient data...");

  while (hasNextPage) {
    const url = BASE_URL + "/patients?page=" + page + "&limit=20";
    console.log(`Fetching page ${page}...`);
    const response = await fetchWithRetry(url, fetchOptions);
    allPatients = allPatients.concat(response.data);
    hasNextPage = response.pagination.hasNext;
    page++;
  }

  console.log(`Successfully fetched ${allPatients.length} patients in total.`);
  return allPatients;
}

getAllPatients()
  .then((patients) => {
    console.log("All patients:", patients);
  })
  .catch((err) => {
    console.error("Failed to fetch all patients:", err.message);
  });

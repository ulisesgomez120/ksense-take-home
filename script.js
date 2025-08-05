const API_KEY = "ak_2af42db29d93ec7c8e292adc7aa6e3bb820e8100c390dc0a";
const BASE_URL = "https://assessment.ksensetech.com/api";

async function getPatients() {
  try {
    let res = await fetch(BASE_URL + "/patients?page=1&limit=20", {
      method: "GET",
      headers: {
        "x-api-key": API_KEY,
      },
    });
    if (!res.ok) {
      throw new Error(res.statusText);
    }

    let data = await res.json();
    console.log(data);
  } catch (err) {
    console.log(err);
  }
}

getPatients();

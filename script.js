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

function getBloodPressureScore(bpString) {
  if (!bpString || typeof bpString !== "string") {
    return { score: 0, issue: true };
  }
  const parts = bpString.split("/");
  if (parts.length !== 2) {
    return { score: 0, issue: true };
  }
  const systolic = parseInt(parts[0], 10);
  const diastolic = parseInt(parts[1], 10);

  if (isNaN(systolic) || isNaN(diastolic)) {
    return { score: 0, issue: true };
  }

  // Stage 2 (Highest risk)
  if (systolic >= 140 || diastolic >= 90) {
    return { score: 3, issue: false };
  }
  // Stage 1
  if (systolic >= 130 || diastolic >= 80) {
    return { score: 2, issue: false };
  }
  // Elevated
  if (systolic >= 120 && diastolic < 80) {
    return { score: 1, issue: false };
  }
  // Normal
  if (systolic < 120 && diastolic < 80) {
    return { score: 0, issue: false };
  }

  // If it doesn't fit any category, it's an issue (though with valid numbers, this is unlikely).
  return { score: 0, issue: true };
}

function getTemperatureScore(temp) {
  const temperature = parseFloat(temp);
  if (isNaN(temperature)) {
    return { score: 0, issue: true };
  }

  if (temperature >= 101.0) {
    return { score: 2, issue: false };
  }
  if (temperature >= 99.6) {
    return { score: 1, issue: false };
  }
  return { score: 0, issue: false };
}

function getAgeScore(age) {
  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum)) {
    return { score: 0, issue: true };
  }

  if (ageNum > 65) {
    return { score: 2, issue: false };
  }
  if (ageNum >= 40) {
    return { score: 1, issue: false };
  }
  return { score: 0, issue: false };
}

function calculateRiskProfile(patient) {
  const bpResult = getBloodPressureScore(patient.blood_pressure);
  const tempResult = getTemperatureScore(patient.temperature);
  const ageResult = getAgeScore(patient.age);

  const totalScore = bpResult.score + tempResult.score + ageResult.score;
  const hasDataQualityIssue = bpResult.issue || tempResult.issue || ageResult.issue;
  const hasFever = !tempResult.issue && parseFloat(patient.temperature) >= 99.6;

  return {
    patient_id: patient.patient_id,
    totalScore,
    hasDataQualityIssue,
    hasFever,
  };
}

function processPatientData(patients) {
  const high_risk_patients = [];
  const fever_patients = [];
  const data_quality_issues = [];

  for (const patient of patients) {
    const { patient_id, totalScore, hasDataQualityIssue, hasFever } = calculateRiskProfile(patient);

    if (hasDataQualityIssue) {
      data_quality_issues.push(patient_id);
    }
    if (totalScore >= 4) {
      high_risk_patients.push(patient_id);
    }
    if (hasFever) {
      fever_patients.push(patient_id);
    }
  }

  return {
    high_risk_patients,
    fever_patients,
    data_quality_issues,
  };
}

getAllPatients()
  .then((patients) => {
    // console.log("All patients:", patients);
    const alertLists = processPatientData(patients);
    console.log("\n--- Patient Alert Lists ---");
    console.log(alertLists);
    // console.log("High-Risk Patients (Score >= 4):", alertLists.high_risk_patients);
    // console.log("Fever Patients (Temp >= 99.6°F):", alertLists.fever_patients);
    // console.log("Data Quality Issues:", alertLists.data_quality_issues);
  })
  .catch((err) => {
    console.error("Failed to fetch all patients:", err.message);
  });

// submit for score
function submitList() {
  // data is from the alertLists variables created in getAllPatients.then, just copied the data from the console.
  const data = {
    high_risk_patients: [
      "DEMO002",
      "DEMO006",
      "DEMO007",
      "DEMO008",
      "DEMO010",
      "DEMO012",
      "DEMO016",
      "DEMO019",
      "DEMO020",
      "DEMO021",
      "DEMO022",
      "DEMO027",
      "DEMO028",
      "DEMO031",
      "DEMO032",
      "DEMO033",
      "DEMO040",
      "DEMO041",
      "DEMO045",
      "DEMO048",
    ],
    fever_patients: ["DEMO005", "DEMO008", "DEMO009", "DEMO012", "DEMO021", "DEMO023", "DEMO037", "DEMO038", "DEMO047"],
    data_quality_issues: ["DEMO004", "DEMO005", "DEMO007", "DEMO023", "DEMO024", "DEMO035", "DEMO036", "DEMO043"],
  };
  fetch("https://assessment.ksensetech.com/api/submit-assessment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Assessment Results:", data);
    });
}
submitList();

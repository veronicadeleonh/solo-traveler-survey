/**
 * Generic function to fetch data and update a Chart.js chart
 * @param {string} url - The API endpoint to fetch data from
 * @param {Chart} chart - The Chart.js instance to update
 * @param {function} dataMapper - A function to map the API response to the chart's data structure
 */


// UPDATE CHARTS
function fetchAndUpdateChart(url, chart, dataMapper) {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(data)
            const { labels, datasetsData } = dataMapper(data);
            chart.data.labels = labels;
            chart.data.datasets.forEach((dataset, index) => {
                dataset.data = datasetsData[index];
            });
            chart.update();
        })
        .catch(error => console.error(`Error fetching data from ${url}:`, error));
}


// DATA MAPPERS

// SOLO TRAVEL COUNT
const soloTravelDataMapper = (data) => ({
    labels: data.labels,
    datasetsData: [data.counts]
});

// SUBMISSION OVER TIME
const submissionsOverTimeDataMapper = (data) => ({
    labels: data.labels,
    datasetsData: [data.values]
});

// AGE DISTRIBUITION
const ageDistributionDataMapper = (data) => ({
    labels: data.labels,
    datasetsData: [data.solo_counts, data.non_solo_counts]
});

// TRAVEL REASON
const travelReasonDataMapper = (data) => ({
    labels: data.labels,
    datasetsData: [data.solo_counts, data.non_solo_counts]
});

// TRAVEL EJOYMENT
const SoloTravelersEnjoymentDataMapper = (data) => ({
    labels: data.labels,
    datasetsData: [data.avg_enjoyment_rates]
});

// TRIP COUNT CHART
const tripEnjoymentDataMapper = (data) => ({
    labels: data.labels,
    datasetsData: [data.solo_counts, data.non_solo_counts]
});




// HELPER FUNCTION
function initializeChart(canvasId, width, height, type, data, options) {
    const canvas = document.getElementById(canvasId);
    canvas.width = width;
    canvas.height = height;
    return new Chart(canvas.getContext('2d'), {
        type: type,
        data: data,
        options: options
    });
}


// INITIALIZE CHARTS
const soloTravelChart = initializeChart(
    'soloTravelChart', 180, 180, 'doughnut',
    {
        labels: [],
        datasets: [{
            data: [],
            label: ' Total Count',
            backgroundColor: ['rgb(190, 242, 100, 0.3)', 'rgb(228, 228, 231, 0.3)'],
            borderColor: ['rgb(190, 242, 100, 1)', 'rgb(228, 228, 231, 1)'],
            borderWidth: 1,
        }]
    },
    { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }} }
);

const submissionsTimeChart = initializeChart(
    'submissionsTime', 400, 80, 'line',
    { 
        labels: [], 
        datasets: [{ 
            data: [], 
            label: ' Submissions',
            backgroundColor: 'rgba(30, 144, 255, 0.2)',
            borderColor: 'rgba(30, 144, 255, 1)',
            borderWidth: 1 
        }] 
    },
    { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false }} }
);

const ageDistributionChart = initializeChart(
    'ageDistributionChart', 300, 150, 'bar',
    { 
        labels: [], 
        datasets: [{ 
            data: [],
            label: ' Solo Travelers', 
            backgroundColor: 'rgba(190, 242, 100, 0.3)',
            borderColor: 'rgb(190, 242, 100, 1)',
            borderWidth: 1 
        }, { 
            data: [],
            label: ' Non-Solo Travelers',
            backgroundColor: 'rgba(228, 228, 231, 0.3)',
            borderColor: 'rgb(228, 228, 231, 1)',
            borderWidth: 1 
        }] 
    },
    {  indexAxis: 'y', responsive: true, plugins: { legend: { display: false }}  }
);


const travelReasonCount = initializeChart(
    'travelReasonCount', 300, 150, 'bar',
    { 
        labels: [], 
        datasets: [{ 
            data: [],
            label: ' Solo Travelers', 
            backgroundColor: 'rgba(190, 242, 100, 0.3)',
            borderColor: 'rgba(190, 242, 100, 1)',
            borderWidth: 1 
        }, { 
            data: [],
            label: ' Non-Solo Travelers',
            backgroundColor: 'rgba(228, 228, 231, 0.3)',
            borderColor: 'rgba(228, 228, 231, 1)',
            borderWidth: 1 
        }] 
    },
    { responsive: true, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }, plugins: { legend: { display: false }}  }
);


const tripEnjoymentChart = initializeChart(
    'tripEnjoymentChart', 300, 150, 'bar',
       { 
        labels: [], 
        datasets: [{ 
            data: [],
            label: ' Solo Travelers', 
            backgroundColor: 'rgba(190, 242, 100, 0.3)',
            borderColor: 'rgba(190, 242, 100, 1)',
            borderWidth: 1 
        }, { 
            data: [],
            label: ' Non-Solo Travelers',
            backgroundColor: 'rgba(228, 228, 231, 0.3)',
            borderColor: 'rgba(228, 228, 231, 1)',
            borderWidth: 1 
        }] 
    },
    {  indexAxis: 'y', responsive: true, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }, plugins: { legend: { display: false }}  }
);


const SoloTravelersEnjoymentChart = initializeChart(
    'SoloTravelersEnjoymentChart', 300, 150, 'bar',
    { 
        labels: [], 
        datasets: [{ 
            data: [], 
            label: ' Average Enjoyment Rate',
            backgroundColor: 'rgba(190, 242, 100, 0.3)',
            borderColor: 'rgba(190, 242, 100, 1)',
            borderWidth: 1 
        }] 
    },
    { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false }} }
);



// FETCH AND UPDATE
fetchAndUpdateChart('/get_solo_travel_count', soloTravelChart, soloTravelDataMapper);
fetchAndUpdateChart('/get_age_distribution', ageDistributionChart, ageDistributionDataMapper);
fetchAndUpdateChart('/get_trip_enjoyment', tripEnjoymentChart, tripEnjoymentDataMapper);
fetchAndUpdateChart('/get_travel_reason_data', travelReasonCount, travelReasonDataMapper);
fetchAndUpdateChart('/get_submissions_over_time', submissionsTimeChart, submissionsOverTimeDataMapper);
fetchAndUpdateChart('/get_solo_travelers_enjoyment', SoloTravelersEnjoymentChart, SoloTravelersEnjoymentDataMapper);


//GET DASHBOARD STATS
function fetchDashboardStats() {
    // console.log("Fetching dashboard stats...")
    fetch('/get_dashboard_stats')
        .then(response => response.json())
        .then(data => {
            // console.log("Dashboard stats data:", data)
            document.getElementById('totalSubmissions').innerText = data.total_submissions;
            document.getElementById('newToday').innerText = data.new_today;
            document.getElementById('soloPercentage').innerText = data.solo_percentage + "%";
            document.getElementById('todayDate').innerText = data.today_date;
            document.getElementById('avgEnjoymentSolo').innerText = data.avg_enjoyment_solo;
            document.getElementById('avgEnjoymentNonSolo').innerText = data.avg_enjoyment_non_solo;
            document.getElementById('avgSpontaneitySolo').innerText = data.avg_spontaneity_solo;
            document.getElementById('avgSpontaneityNonSolo').innerText = data.avg_spontaneity_non_solo;

        })
        .catch(error => console.error('Error fetching dashboard stats:', error));
}

// FORM AND MODELS SUBMISSION POST
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('survey-form');
    const steps = document.querySelectorAll('.step');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    let currentStep = 0;

    // Show the current step and hide others
    function showStep(stepIndex) {
        steps.forEach((step, index) => {
            if (index === stepIndex) {
                step.classList.remove('hidden');
            } else {
                step.classList.add('hidden');
            }
        });

        // Update button visibility
        if (stepIndex === steps.length - 1) {
            // Hide all buttons on the results step (step 8)
            prevBtn.classList.add('hidden');
            nextBtn.classList.add('hidden');
            submitBtn.classList.add('hidden');
        } else {
            // Show appropriate buttons for other steps
            prevBtn.classList.toggle('hidden', stepIndex === 0); // Hide "Previous" on step 1
            nextBtn.classList.toggle('hidden', stepIndex === steps.length - 2); // Hide "Next" on step 7
            submitBtn.classList.toggle('hidden', stepIndex !== steps.length - 2); // Show "Submit" only on step 7
        }
    }

    // Show the first step initially
    showStep(currentStep);

    // Next button click handler
    nextBtn.addEventListener('click', function () {
        if (currentStep < steps.length - 1) {
            currentStep++;
            showStep(currentStep);
        }
    });

    // Previous button click handler
    prevBtn.addEventListener('click', function () {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        }
    });

    // Function to fetch region for a country
    async function getRegionForCountry(country) {
        const restResponse = await fetch(`https://restcountries.com/v3.1/name/${country}`);
        const restData = await restResponse.json();

        if (restData.length > 0) {
            const subregion = restData[0].subregion; // Get the subregion (e.g., "Western Europe")
            const region = restData[0].region; // Get the region (e.g., "Europe")
            return subregion || region || country; // Use subregion, region, or country name
        } else {
            console.error('Country not found in REST Countries API.');
            return country; // Fallback to country name
        }
    }

    // Handle form submission
    form.addEventListener('submit', async function (event) {
        event.preventDefault(); // Prevent the default form submission
        console.log('Form submission started');

        try {
            // Log the current and next country values
            const currentCountry = document.getElementById('current_country').value;
            const nextCountry = document.getElementById('next_country').value;
            console.log('Current Country:', currentCountry);
            console.log('Next Country:', nextCountry);

            // Fetch regions
            const currentRegion = await getRegionForCountry(currentCountry);
            const nextRegion = await getRegionForCountry(nextCountry);
            console.log('Current Region:', currentRegion);
            console.log('Next Region:', nextRegion);

            // Create FormData and log its contents
            const formData = new FormData(form);
            formData.set('current_region', currentRegion);
            formData.set('next_region', nextRegion);
            for (const [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }

            // Submit the form data to the backend
            const response = await fetch('/submit_survey', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to submit survey');
            }

            const data = await response.json(); // Parse the JSON response
            console.log('Response data:', data);

            // Display sentiment and cluster results
            document.getElementById('sentiment-result').innerHTML = `<p>You sound <span style="font-weight:bold">${data.sentiment}</span> about your trip.</p>`;
            document.getElementById('cluster-result').innerHTML = `<p>${data.travel_cluster}</p>`;

            // Move to the results step (step 8)
            currentStep = steps.length - 1; // Set currentStep to the last step
            showStep(currentStep); // Show the results step

            // Update charts
            updateCharts();
        } catch (error) {
            console.error('Error:', error);
            // Display the error message in the results section
            document.getElementById('sentiment-result').innerHTML = `<p>Error: ${error.message}</p>`;
            document.getElementById('cluster-result').innerHTML = `<p>Please try again.</p>`;
        }
    });
});


// Fetch and display dashboard stats on page load
fetchDashboardStats();

// UPDATE CHARTS FUNCTION
function updateCharts() {
    fetchAndUpdateChart('/get_solo_travel_count', soloTravelChart, soloTravelDataMapper);
    fetchAndUpdateChart('/get_age_distribution', ageDistributionChart, ageDistributionDataMapper);
    fetchAndUpdateChart('/get_trip_enjoyment', tripEnjoymentChart, tripEnjoymentDataMapper);
    fetchAndUpdateChart('/get_travel_reason_data', travelReasonCount, travelReasonDataMapper);
    fetchAndUpdateChart('/get_submissions_over_time', submissionsTimeChart, submissionsOverTimeDataMapper);
    fetchAndUpdateChart('/get_solo_travelers_enjoyment', SoloTravelersEnjoymentChart, SoloTravelersEnjoymentDataMapper);
    fetchDashboardStats()
}
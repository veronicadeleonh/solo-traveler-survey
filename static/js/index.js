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

// TRAVEL REASON
const travelReasonDataMapper = (data) => ({
    labels: data.labels,
    datasetsData: [data.solo_counts, data.non_solo_counts]
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
    'soloTravelChart', 200, 200, 'doughnut',
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
    'submissionsTime', 500, 100, 'line',
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

const travelReasonCount = initializeChart(
    'travelReasonCount', 300, 150, 'bar',
    { 
        labels: [], 
        datasets: [{ 
            data: [],
            label: ' Solo Travelers', 
            backgroundColor: 'rgb(190, 242, 100, 0.3)',
            borderColor: 'rgb(190, 242, 100, 1)',
            borderWidth: 1 
        }, { 
            data: [],
            label: 'Non-Solo Travelers',
            backgroundColor: 'rgb(228, 228, 231, 0.3)',
            borderColor: 'rgb(228, 228, 231, 1)',
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
            backgroundColor: 'rgb(190, 242, 100, 0.3)',
            borderColor: 'rgb(190, 242, 100, 1)',
            borderWidth: 1 
        }, { 
            data: [],
            label: 'Non-Solo Travelers',
            backgroundColor: 'rgb(228, 228, 231, 0.3)',
            borderColor: 'rgb(228, 228, 231, 1)',
            borderWidth: 1 
        }] 
    },
    {  indexAxis: 'y', responsive: true, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }, plugins: { legend: { display: false }}  }
);


// FETCH AND UPDATE
fetchAndUpdateChart('/get_solo_travel_count', soloTravelChart, soloTravelDataMapper);
fetchAndUpdateChart('/get_trip_enjoyment', tripEnjoymentChart, tripEnjoymentDataMapper);
fetchAndUpdateChart('/get_travel_reason_data', travelReasonCount, travelReasonDataMapper);
fetchAndUpdateChart('/get_submissions_over_time', submissionsTimeChart, submissionsOverTimeDataMapper);


//GET DASHBOARD STATS
function fetchDashboardStats() {
    console.log("Fetching dashboard stats...")
    fetch('/get_dashboard_stats')
        .then(response => response.json())
        .then(data => {
            console.log("Dashboard stats data:", data)
            document.getElementById('totalSubmissions').innerText = data.total_submissions;
            document.getElementById('newToday').innerText = data.new_today;
            document.getElementById('soloPercentage').innerText = data.solo_percentage + "%";
            document.getElementById('avgEnjoyment').innerText = data.avg_enjoyment;
            document.getElementById('todayDate').innerText = data.today_date;
        })
        .catch(error => console.error('Error fetching dashboard stats:', error));
}

// Fetch and display dashboard stats on page load
fetchDashboardStats();


// UPDATE CHARTS FUNCTION
function updateCharts() {
    fetchAndUpdateChart('/get_solo_travel_count', soloTravelChart, soloTravelDataMapper);
    fetchAndUpdateChart('/get_trip_enjoyment', tripEnjoymentChart, tripEnjoymentDataMapper);
    fetchAndUpdateChart('/get_travel_reason_data', travelReasonCount, travelReasonDataMapper);
    fetchAndUpdateChart('/get_submissions_over_time', submissionsTimeChart, submissionsOverTimeDataMapper);
    fetchDashboardStats()
}

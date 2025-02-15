//GLOBAL VARIABLES
let soloTravelChart; 
let tripCountChart;
let travelReasonCount;
let submissionsTime;

// Chart.defaults.backgroundColor = '#9BD0F5';
// Chart.defaults.borderColor = '#36A2EB';
Chart.defaults.color = '#fff'

document.addEventListener('DOMContentLoaded', function () {

// TOTAL SUBMISSIONS
fetch("/total_submissions")
    .then(response => response.json())
    .then(data => {
        document.getElementById("total-submissions").textContent = data.total_submissions;
        })
    .catch(error => console.error("Error fetching total submissions:", error));


// SOLO TRAVEL CHART
fetch('/get_solo_travel_count')
    .then(response => response.json())
    .then(data => {
        const ctx = document.getElementById('soloTravelChart').getContext('2d');
        soloTravelChart = new Chart(ctx, {
            type: 'doughnut',  // You can change to 'pie' or another type if you prefer
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Count of Submissions',
                    data: data.counts,  // Corresponding counts
                    backgroundColor: ['rgba(46, 213, 115, 0.2)', 'rgba(153, 102, 255, 0.2)'],  // Different colors for solo vs not solo
                    borderColor: ['rgba(46, 213, 115, 1)', 'rgba(153, 102, 255, 1)'],
                    borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                            y: {
                            beginAtZero: true
                            }
                        }
                    }
                });
            })
    .catch(error => console.error('Error fetching data:', error));


// HOW MANY TRIPS COUNT CHART
fetch('/get_trip_count')
    .then(response => response.json())
    .then(data => {
        const ctx = document.getElementById('tripCountChart').getContext('2d');

        // FETCHED DATA
        tripCountChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Number of Solo Travelers by Trip Count',
                    data: data.values,
                    backgroundColor: 'rgba(255, 127, 80, 0.2)',
                    borderColor: 'rgba(255, 127, 80, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    })
    .catch(error => console.error('Error fetching initial chart data:', error));


// TRAVEL REASON COUNT CHART
fetch('/get_travel_reason_data')
    .then(response => response.json())
    .then(data => {
        const ctx2 = document.getElementById('travelReasonCount').getContext('2d');

        // FETCHED DATA
        travelReasonCount = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Travel Reason',
                    data: data.values,
                    backgroundColor: 'rgba(255, 71, 87, 0.2)',
                    borderColor: 'rgba(255, 71, 87, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    })
    .catch(error => console.error('Error fetching travel reason data:', error));


// SUBMISSIONS OVER TIME
fetch('/get_submissions_over_time')
    .then(response => response.json())
    .then(data => {
        const ctx2 = document.getElementById('submissionsTime').getContext('2d');

        // FETCHED DATA
        travelReasonCount = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Travel Reason',
                    data: data.values,
                    backgroundColor: 'rgba(30, 144, 255, 0.2)',
                    borderColor: 'rgba(30, 144, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    })
    .catch(error => console.error('Error fetching travel reason data:', error));



// HANDLE SURVEY SUBMISSION
const form = document.getElementById("survey-form");
form.addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = new FormData(form);
    fetch("/submit_survey", {
        method: "POST",
        body: formData,
    })
        .then(response => response.json())
        .then(data => {
            console.log("Survey submitted successfully:", data);


            // SENTIMENT PREDICTION
            const sentimentResultDiv = document.getElementById("sentiment-result");
            sentimentResultDiv.innerHTML = `<p>Your travel sentiment is <strong>${data.sentiment}</strong></p>`;
            sentimentResultDiv.style.display = "block";  // Make it visible

            // CLUSTER PREDICTION
            const clusterResultDiv = document.getElementById("cluster-result");
            clusterResultDiv.innerHTML = `<p>Your cluster: <strong>${data.travel_cluster}</strong></p>`;
            clusterResultDiv.style.display = "block";  // Ensure it's visible along with sentiment


            updateCharts();

        })
        .catch(error => {
            console.error("Error submitting survey:", error);
        });
});


// UPDATE CHARTS FUNCTION - DONT TOUCH!
function updateCharts() {
    fetch("/total_submissions")
    .then(response => response.json())
    .then(data => {
        document.getElementById("total-submissions").textContent = data.total_submissions;
    })
    .catch(error => console.error("Error fetching total submissions:", error));


    fetch('/get_solo_travel_count')
        .then(response => response.json())
        .then(data => {
            // Update the solo travel chart
            soloTravelChart.data.labels = data.labels;  // Update labels
            soloTravelChart.data.datasets[0].data = data.counts;  // Update counts
            soloTravelChart.update();  // Apply the changes
        })
        .catch(error => console.error('Error fetching updated solo_travel_count:', error));


    fetch('/get_trip_count')
        .then(response => response.json())
        .then(data => {
            // Update the trip count chart
            tripCountChart.data.labels = data.labels;
            tripCountChart.data.datasets[0].data = data.values;
            tripCountChart.update(); 
        })
        .catch(error => console.error('Error fetching updated get_trip_count:', error));


    fetch('/get_travel_reason_data')
        .then(response => response.json())
        .then(data => {
            // Update the travel reason chart
            travelReasonCount.data.labels = data.labels;
            travelReasonCount.data.datasets[0].data = data.values;
            travelReasonCount.update(); 
        })
        .catch(error => console.error('Error fetching updated get_travel_reason_data:', error));

}
});
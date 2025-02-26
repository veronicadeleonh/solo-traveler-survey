//GLOBAL VARIABLES
let soloTravelChart; 
let tripCountChart;
let travelReasonCount;
let submissionsTime;
let spontaneityEnjoyment;

// Chart.defaults.backgroundColor = '#9BD0F5';
// Chart.defaults.borderColor = '#36A2EB';
// Chart.defaults.color = '#fff'

document.addEventListener('DOMContentLoaded', function () {   

// SOLO TRAVEL CHART
fetch('/get_solo_travel_count')
    .then(response => response.json())
    .then(data => {
        const canvas = document.getElementById('soloTravelChart');
        canvas.width = 150; // Set width
        canvas.height = 150; // Set height

        const ctx = canvas.getContext('2d');
        soloTravelChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Total Count',
                    data: data.counts,
                    backgroundColor: ['rgb(190, 242, 100, 0.3)', 'rgb(228, 228, 231, 0.3)'],
                    borderColor: ['rgb(190, 242, 100, 1)', 'rgb(228, 228, 231, 1)'],
                    borderWidth: 1,            
                }]
            },
            options: {
                responsive: false, // Disable responsiveness
                maintainAspectRatio: false, // Disable aspect ratio
                plugins: {
                    legend: { // Legend configuration (if needed)
                        display: false, // Show or hide the legend
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



// TRAVEL REASON STACKED BAR CHART
fetch('/get_travel_reason_data')
    .then(response => response.json())
    .then(data => {
        console.log("API data:", data)

        const ctx2 = document.getElementById('travelReasonCount').getContext('2d');

        new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Solo Travelers',
                        data: data.solo_counts,
                        backgroundColor: 'rgb(190, 242, 100, 0.3)',
                        borderColor: 'rgb(190, 242, 100, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Non-Solo Travelers',
                        data: data.non_solo_counts,
                        backgroundColor: 'rgb(228, 228, 231, 0.3)',
                        borderColor: 'rgb(228, 228, 231, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
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
        const canvas = document.getElementById('submissionsTime');

        canvas.width = 500; // Set width
        canvas.height = 100; // Set height

        const ctx = canvas.getContext('2d');
        travelReasonCount = new Chart(ctx, {
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
                },
                plugins: {
                    legend: { // Legend configuration (if needed)
                        display: false, // Show or hide the legend
                    }
                }
            }
        });
    })
    .catch(error => console.error('Error fetching data:', error));


// SPONTANEITY VS ENJOYMENT

fetch('/get_spontaneity_enjoyment')
    .then(response => response.json())
    .then(data => {
        console.log("Spontaneity:", data.spontaneity);
        console.log("Enjoyment:", data.enjoyment);

        const ctx = document.getElementById('spontaneityEnjoyment').getContext('2d');

        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Spontaneity vs. Enjoyment (Solo Travelers)',
                    data: data.spontaneity.map((value, index) => ({
                        x: value,  
                        y: data.enjoyment[index]  
                    })),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: { display: true, text: 'Spontaneity Score' }
                    },
                    y: {
                        title: { display: true, text: 'Enjoyment Rate' }
                    }
                }
            }
        });
    })
    .catch(error => console.error('Error fetching scatter data:', error));



// GET DASHBOARD STATS
fetch('/get_dashboard_stats')
    .then(response => response.json())
    .then(data => {
        console.log("get_dashboard_data", data)
        document.getElementById('totalSubmissions').innerText = data.total_submissions;
        document.getElementById('newToday').innerText = data.new_today;
        document.getElementById('soloPercentage').innerText = data.solo_percentage + "%";
        document.getElementById('avgEnjoyment').innerText = data.avg_enjoyment;
        document.getElementById('todayDate').innerText = data.today_date;
    })
    .catch(error => console.error('Error fetching dashboard stats:', error));



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

    
    fetch('/get_spontaneity_enjoyment')
        .then(response => response.json())
        .then(data => {
            // Update the travel reason chart
            spontaneityEnjoyment.data.labels = data.labels;
            spontaneityEnjoyment.data.datasets[0].data = data.values;
            spontaneityEnjoyment.update(); 
        })
        .catch(error => console.error('Error fetching updated get_spontaneity_enjoyment:', error));


    fetch('/get_dashboard_stats')
        .then(response => response.json())
        .then(data => {
            // Update dashboard data
            totalSubmissions.data.labels = data.labels;
            totalSubmissions.data.datasets[0].data = data.values;
            totalSubmissions.update(); 

            newToday.data.labels = data.labels;
            newToday.data.datasets[0].data = data.values;
            newToday.update(); 

            soloPercentage.data.labels = data.labels;
            soloPercentage.data.datasets[0].data = data.values;
            soloPercentage.update();

            avgEnjoyment.data.labels = data.labels;
            avgEnjoyment.data.datasets[0].data = data.values;
            avgEnjoyment.update(); 

            todayDate.data.labels = data.labels;
            todayDate.data.datasets[0].data = data.values;
            todayDate.update(); 
        })
        .catch(error => console.error('Error fetching updated get_spontaneity_enjoyment:', error));

}
});


// GET DASHBOARD DATA
// fetch('/get_dashboard_data')
//     .then(response => response.json())
//     .then(data => {

//         // Solo travel pie chart
//         const soloLabels = Object.keys(data.solo_travel).map(key => key == 1 ? "Solo" : "Not Solo");
//         const soloValues = Object.values(data.solo_travel);

//         new Chart(document.getElementById('soloTravelChart'), {
//             type: 'pie',
//             data: {
//                 labels: soloLabels,
//                 datasets: [{
//                     data: soloValues,
//                     backgroundColor: ['#4CAF50', '#FF5733']
//                 }]
//             }
//         });

//         // Travel reasons bar chart (stacked)
//         new Chart(document.getElementById('travelReasonChart'), {
//             type: 'bar',
//             data: {
//                 labels: data.travel_reason_data.map(d => d.travel_reason),
//                 datasets: [{
//                     label: 'Travel Reasons',
//                     data: data.travel_reason_data.map(d => d.count),
//                     backgroundColor: '#2196F3'
//                 }]
//             },
//             options: {
//                 responsive: true,
//                 scales: { y: { beginAtZero: true } }
//             }
//         });

//         // Submissions over time (line chart)
//         new Chart(document.getElementById('submissionsOverTimeChart'), {
//             type: 'line',
//             data: {
//                 labels: data.submissions_over_time.map(d => d.date),
//                 datasets: [{
//                     label: 'Submissions Over Time',
//                     data: data.submissions_over_time.map(d => d.count),
//                     borderColor: '#FF9800',
//                     fill: false
//                 }]
//             }
//         });

//         // Scatter plot for Enjoyment vs Spontaneity
//         new Chart(document.getElementById('scatterPlotChart'), {
//             type: 'scatter',
//             data: {
//                 datasets: [{
//                     label: 'Spontaneity vs Enjoyment',
//                     data: data.enjoyment_vs_spontaneity.map(d => ({ x: d.spontaneity_score, y: d.enjoyment_rate })),
//                     backgroundColor: '#673AB7'
//                 }]
//             },
//             options: {
//                 scales: {
//                     x: { type: 'linear', position: 'bottom' },
//                     y: { beginAtZero: true }
//                 }
//             }
//         });

//     })
//     .catch(error => console.error('Error fetching dashboard data:', error));

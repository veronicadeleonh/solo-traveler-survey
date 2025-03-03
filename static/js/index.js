// Fetch countries from the REST Countries API
fetch('https://restcountries.com/v3.1/all')
  .then(response => response.json())
  .then(data => {
    const datalist = document.getElementById('countries');

    // Clear any existing options
    datalist.innerHTML = '';

    // Add each country to the datalist
    data.forEach(country => {
      const option = document.createElement('option');
      option.value = country.name.common; // Use the common name of the country
      option.textContent = `${country.name.common} ${country.flag}`; // Add flag emoji
      datalist.appendChild(option);
    });
  })
  .catch(error => {
    console.error('Error fetching countries:', error);
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
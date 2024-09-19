function submitForm(event) {
    event.preventDefault(); // Prevent form submission to allow custom handling
    
    const form = document.getElementById('hazardForm');
    const hazards = [];
    const riskRatings = [];
    const safetyWorks = form.safetyWorks.value;
    const firstAid = form.firstAid.value;
    const environmentalDetails = form.environmentalDetails.value;

    for (let i = 1; i <= 4; i++) {
        hazards.push(form[`hazard${i}`].value);
        riskRatings.push(form[`riskRating${i}`].value);
    }

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <h3>Results</h3>
        <p><strong>Hazards:</strong> ${hazards.join(', ')}</p>
        <p><strong>Risk Ratings:</strong> ${riskRatings.join(', ')}</p>
        <p><strong>Important Safety Works:</strong> ${safetyWorks}</p>
        <p><strong>First Aid Facilities Adequacy:</strong> ${firstAid}</p>
        <p><strong>Environmental and Air Quality Details:</strong> ${environmentalDetails}</p>
    `;

    // Redirect to homepage after form submission
    window.location.href = "index.html"; // Adjust the URL to your homepage
}

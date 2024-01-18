// Fetch for region to get region id
let userLocation = "Wroclaw"


function getRegionId(callback) {

    const url = `https://hotels-com-provider.p.rapidapi.com/v2/regions?query=${userLocation}&domain=AE&locale=en_GB`;
    const options = {
	    method: 'GET',
	    headers: {
		    'X-RapidAPI-Key': 'b5a9039af8mshf35a3ef3045004ep1efb1cjsndf46ef774554',
		    'X-RapidAPI-Host': 'hotels-com-provider.p.rapidapi.com'
	    }
    };

    fetch(url, options)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            callback(data);
        })
}




// Fetch for retrieving list of hotels based on region id received from the above fetch
function getHotelsList() {
    getRegionId(function(data) {
        console.log(data);
    })


}


getHotelsList();
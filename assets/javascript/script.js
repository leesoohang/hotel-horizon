let userInput = "Barcelona"
// Fetch cordinates based on user Input
function getCordinates(location, callback) {


    const url = `https://forward-reverse-geocoding.p.rapidapi.com/v1/search?q=${location}&accept-language=en&polygon_threshold=0.0`;
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': 'b5a9039af8mshf35a3ef3045004ep1efb1cjsndf46ef774554',
            'X-RapidAPI-Host': 'forward-reverse-geocoding.p.rapidapi.com'
        }
    };
    
    fetch(url, options)
        .then(function(response) {
            return response.json()
        })
        .then(function(data) {
            console.log(data)
            let cordinates = {
                lat: data[0].lat,
                lon: data[0].lon
            }
            callback(cordinates)
        })
}

// Fetch hotel based on cordinates retrieved from "getCordinates()"
function getHotel(userInput) {
    getCordinates(userInput, function(cordinates) {
       
        let lat = cordinates.lat
        let lon = cordinates.lon

        // Define the base URL
        const baseUrl = 'https://booking-com.p.rapidapi.com/v1/hotels/search-by-coordinates';

        // Define query parameters as an object
        const queryParams = {
            locale: 'en-gb',
            room_number: 1,
            checkin_date: '2024-05-19',
            checkout_date: '2024-05-20',
            filter_by_currency: 'GBP',
            longitude: lon,
            latitude: lat,
            adults_number: 2,
            order_by: 'popularity',
            units: 'metric',
            page_number: 0,
            children_number: 2,
            include_adjacency: true,
            children_ages: '5,0',
            categories_filter_ids: 'class::2,class::4,free_cancellation::1'
        };

        // Create an array of query parameter strings
        const queryParamStrings = Object.keys(queryParams).map(key => `${key}=${encodeURIComponent(queryParams[key])}`);

        // Combine the base URL and query parameters
        const url = `${baseUrl}?${queryParamStrings.join('&')}`;

        const options = {
	        method: 'GET',
	        headers: {
		        'X-RapidAPI-Key': 'b5a9039af8mshf35a3ef3045004ep1efb1cjsndf46ef774554',
		        'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
	        }
        };

        // fetch api to retrieve a data
        fetch(url, options)
            .then(function(response) {
                return response.json();
            })
            .then(async function(data) {

                // pass to processHotels data.result as that's where all data is we need
                let processedHotels = processHotels(data.result)
                updateDOMWithHotels(processedHotels);
                console.log(processedHotels)

            })
            .catch(function(error) {
                console.error("Error message: " + error);
            })
    })
}


// Function to fetch description for each hotel
function getHotelPhotos(hotelId) {

    const url = `https://booking-com.p.rapidapi.com/v1/hotels/photos?hotel_id=${hotelId}&locale=en-gb`;
    const options = {
	    method: 'GET',
	    headers: {
		    'X-RapidAPI-Key': 'b5a9039af8mshf35a3ef3045004ep1efb1cjsndf46ef774554',
		    'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
	}
};

    return fetch(url, options)
        .then(function(response) {
            return response.json()
        })
        .then(function(data) {
            // Map through the data and return array of pictures URL's
            return data.map(function(picture) {
                return {
                    pictureUrl: picture.url_max
                }
            })
        })
        .catch(function(error) {
            console.error("Error message: " + error);
            // Return empty array in case of any errors to allow continous functioning
            return [];
        })

}


// Function to extract specific data for each hotel from the api response
function processHotels(hotelsData) {

    return hotelsData.map(function(hotel) {
        // Return an object containing processed data for each of the hotels
        return {
            hotelId: hotel.hotel_id,
            hotelLat: hotel.latitude,
            hotelLon: hotel.longitude,
            hotelName: hotel.hotel_name,
            reviewScore: hotel.review_score,
            reviewScoreWord: hotel.review_score_word,
            hotelPhoto: hotel.max_photo_url,
            hotelAddressRoad: hotel.address,
            hotelAddressPostal: hotel.zip,
            hotelCheckIn: hotel.checkin.from,
            hotelCheckOut: hotel.checkout.until,
            hotelNightPrice: hotel.min_total_price,
            bookingComLink: hotel.url,
        }
    })
}

// getHotelPhotos("35352")
//     .then(function(pictures) {
//         console.log(pictures)
//     })
getHotel();

// Using jQuery to manipulate DOM
function updateDOMWithHotels(hotelsData) {
    let mainContainer = $(".container");

    hotelsData.forEach(function(hotel) {

        // Some of hotels don't have reviews, need to replace that if that's the case using ternary operator
        let reviewScore = hotel.reviewScore ? `⭐${hotel.reviewScore} (${hotel.reviewScoreWord})` : "No score yet";

        // Creating hotel card element with data retrieved from API
        let hotelCard = 
            `
            <div class="card hotel" data-id=${hotel.hotelId} style="width: 18rem;">
                <img class="card-img-top" src=${hotel.hotelPhoto} alt="Hotel picture">
                <div class=card-body>
                    <h5>${hotel.hotelName}</h5>
                    <p classs="card-text">Adress: ${hotel.hotelAddressRoad}, <span> ${hotel.hotelAddressPostal}</span></p>
                    <p class="card-text">Price: £${Math.round(hotel.hotelNightPrice)}</p>
                    <p class="card-text">Review: ${reviewScore}</span></p>
                </div>
                <a class="btn btn-info" src="${hotel.bookingComLink}" target="_blank">Book Now</a>
                <button class="btn btn-info getPhoto-btn">Photos</button>
            </div>
            `;

        // Append card to main container in HTML
        mainContainer.append(hotelCard);
    });
}

$(".container").on("click", ".getPhoto-btn", function(event) {
    // Use closest to get closest parent element with class .hotel and extract data attribute data-id
    let hotelId = $(this).closest(".hotel").data("id")


    getHotelPhotos(hotelId)
        .then(function(photos) {

            // Limit of photos to display to 10
            let limitPhotos = photos.slice(0,10);

            // Loop through the array received from API and create modal with photos of the hotel
            let modalPictures = `
            <div class="modal fade" id="photoModal" tabindex="-1" role="dialog" aria-labelledby="photoModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg" role="document"> <!-- 'modal-lg' for larger modal -->
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="photoModalLabel">Photos</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            ${limitPhotos.map(function(photo) {
                                return `<img src="${photo.pictureUrl}" alt="Picture of hotel" class="img-fluid">`;
                            }).join("")}
                        </div>
                    </div>
                </div>
            </div>
        `;
            $('body').append(modalPictures);

            $("#photoModal").modal("show");
        })

})


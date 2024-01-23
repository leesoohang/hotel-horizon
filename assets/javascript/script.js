let savedHotelData = [];


// --------------------------  GeoLocation API section --------------------------

// Fetch cordinates based on user Input
function getCordinates(userInput, callback) {


    const url = `https://forward-reverse-geocoding.p.rapidapi.com/v1/search?q=${userInput}&accept-language=en&polygon_threshold=0.0`;
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
            let cordinates = {
                lat: data[0].lat,
                lon: data[0].lon
            }
            console.log(cordinates)
            callback(cordinates)
        })
        .catch(function(error) {
            console.error("Error message: " + error);
        })
}

// --------------------------  Booking com API section --------------------------

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
                // Save all the data 
                saveHotelData(processedHotels)

                updateDOMWithHotels(processedHotels);

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


// --------------------------  Google API section --------------------------


let service; // Google Places service
let infowindow; // Info window for displaying place details
let hotelMarkers = []; // Array to hold map markers
let restaurantMarkers = []; // Array to hold restaurant markers

// Function to initialize the map
function initMap(query) {
    // Check if query is a valid string also need to set up default as script in html
    // has callback function initMap 
    if (typeof query !== 'string') {
        query = "London" // Default query to "London" if no valid string is provided
    }

    const defaultPlace = new google.maps.LatLng(51.509865, -0.118092); // Default to London Covent Garden

    // Clear any existing markers
    hotelMarkers.forEach(marker => marker.setMap(null));
    hotelMarkers = [];
    

    // Initialize info window
    infowindow = new google.maps.InfoWindow();

    // Initialize map with default center and zoom level
    map = new google.maps.Map(document.getElementById("mapContainer"), {
        center: defaultPlace,
        zoom: 17,
    });

    // Create a request object for the Places API
    const request = {
        query: query,
        fields: ["name", "geometry"],
    };

    // Initialize Places service
    service = new google.maps.places.PlacesService(map);

    // Use the Places service to find a place from the query
    service.findPlaceFromQuery(request, (results, status) => {
        // If the query was successful and returned results, create a marker and center the map on the first result
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            createMarker(results[0]);
            map.setCenter(results[0].geometry.location);
        }
    });
}

// Function to create a marker for a place
function createMarker(place) {
    // If the place doesn't have a valid geometry or location, return without creating a marker
    if (!place.geometry || !place.geometry.location) return;

    // Create a new marker at the place's location
    const marker = new google.maps.Marker({
        map,
        position: place.geometry.location,
        label: "Your Hotel",
    });

    // Add the new marker to the markers array
    hotelMarkers.push(marker);

    // Add a click event listener to the marker to open the info window with the place's name
    google.maps.event.addListener(marker, "click", () => {
        infowindow.setContent(place.name || "");
        infowindow.open(map, marker);
    });
}

// Updating map using a adress
function updateMapWithAddress(address) {
    
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ 'address': address }, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
            map.setCenter(results[0].geometry.location);

            // Clear existing markers
            hotelMarkers.forEach(marker => marker.setMap(null));
            hotelMarkers = [];

            const marker = new google.maps.Marker({
                map,
                position: results[0].geometry.location,
            });

            hotelMarkers.push(marker);
        } else {
            console.error('Geocode was not successful for the following reason: ' + status);
        }
    });
    
}

function updateMapWithCoordinates(lat, lon) {
    
    const location = new google.maps.LatLng(lat, lon);
    map.setCenter(location);

    // Clear existing markers
    hotelMarkers.forEach(marker => marker.setMap(null));
    hotelMarkers = [];

    // Set the center of the map
    map.setCenter(location);

    // Add a marker at the new location
    const marker = new google.maps.Marker({
        map,
        position: location,
        label: "Your Hotel",
    });

    hotelMarkers.push(marker);
}


// Find Nearby Restruants
function findNearbyRestaurants(location) {
    const request = {
        location: location,
        radius: '500', // Search within a 500m radius
        type: ['restaurant'] // Search for restaurants
    };

    service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            // Clear existing markers
            restaurantMarkers.forEach(marker => marker.setMap(null));
            restaurantMarkers = [];

            results.forEach(place => {
                if (!place.geometry || !place.geometry.location) return;

                const marker = new google.maps.Marker({
                    map,
                    position: place.geometry.location,
                    icon: "https://maps.google.com/mapfiles/kml/pal2/icon36.png",
                });

                restaurantMarkers.push(marker);

                // Optionally, add info windows for each restaurant
                google.maps.event.addListener(marker, 'click', () => {
                    infowindow.setContent(place.name || '');
                    infowindow.open(map, marker);
                });
            });
        }
    });
}



// --------------------------  DOM Manipulation section --------------------------

// Using jQuery to manipulate DOM
// function updateDOMWithHotels(hotelsData) {

    
//     let hotelsContainer = $(".hotels-container");
//     let searchResultsText = $("<span>").addClass(".Search-results-text")
//     // Clears any previous search
//     hotelsContainer.empty();

//     searchResultsText.text(`(Place holder for userSearch Input): ${hotelsData.length} hotels found`)
//     hotelsContainer.append(searchResultsText);
//     console.log(hotelsData);

//     let savedHotels = localStorage.getItem("savedHotels");
//     savedHotels = savedHotels ? JSON.parse(savedHotels) : [];


//     hotelsData.forEach( function(hotel) {

        
//         let isFavourite = savedHotels.some(function(savedHotel) {
//             return savedHotel.hotelId === hotel.hotelId;
//         })
//         let heartClass = isFavourite ? "fa-solid fa-heart" : "fa-regular fa-heart";
//         let heartColor = isFavourite ? "color: #be2323;" : "";
       
//         // Some of hotels don't have reviews, need to replace that if that's the case using ternary operator
//         let reviewScore = hotel.reviewScore ? `⭐${hotel.reviewScore} (${hotel.reviewScoreWord})` : "No score yet";

//         // Creating hotel card element with data retrieved from API
//         let hotelCard = 
//              `
//               <div class="card-hotel" data-id=${hotel.hotelId}>
//                    <div class="card-image">
//                        <img class="card-img-top" src=${hotel.hotelPhoto} alt="Hotel picture">
//                    </div>
//                    <div class="card-content">
//                        <div class="card-body">
//                            <h5>${hotel.hotelName}</h5>
//                            <p class="card-text">Address: ${hotel.hotelAddressRoad}, <span> ${hotel.hotelAddressPostal}</span></p>
//                            <p class="card-text">Price: £${Math.round(hotel.hotelNightPrice)}</p>
//                            <p class="card-text">${reviewScore}</span></p>
//                        </div>
//                        <div class="card-footer">
//                            <a class="btn btn-info" href="${hotel.bookingComLink}" target="_blank">Book Now</a>
//                            <button class="btn btn-info getPhoto-btn">Photos</button>
//                            <button type="button" class="btn btn-info open-map" data-toggle="modal" data-target="#mapModal"
//                                    data-name=${hotel.hotelName} data-lat="${hotel.hotelLat}" data-lon="${hotel.hotelLon}"
//                                   data-address="${hotel.hotelAddressRoad}, ${hotel.hotelAddressPostal}">
//                                Show on Map
//                            </button>
//                            <button class="btn btn-info getRestaurant" data-target="#mapModal" data-lat="${hotel.hotelLat}" data-lon="${hotel.hotelLon}">Find nearby restaurants</button>
//                            <button class="btn btn-info saveFavourite"><i class="${heartClass} heart-icon" style="${heartColor}"></i></button>
//                            </div>
//                    </div>
//                </div>
//              `;

//         // Append card to main container in HTML
//         hotelsContainer.append(hotelCard);
//     });
// }
//  ------------------    This testing function is for layout only so no need to call APi ------------



function updateDOMWithHotels(hotels) {

    let hotelsContainer = $(".hotels-container");
    let searchResultsText = $("<span>").addClass(".Search-results-text")
    // Clears any previous search
    hotelsContainer.empty();

    searchResultsText.text(`(Place holder for userSearch Input): ${hotels.length} hotels found`)
    hotelsContainer.append(searchResultsText);
    console.log(hotels);

    let savedHotels = localStorage.getItem("savedHotels");
    savedHotels = savedHotels ? JSON.parse(savedHotels) : [];


    hotels.forEach( function(hotel) {

        
        let isFavourite = savedHotels.some(function(savedHotel) {
            return savedHotel.hotelId === hotel.hotelId;
        })
        let heartClass = isFavourite ? "fa-solid fa-heart" : "fa-regular fa-heart";
        let heartColor = isFavourite ? "color: #be2323;" : "";
       
        // Some of hotels don't have reviews, need to replace that if that's the case using ternary operator
        let reviewScore = hotel.reviewScore ? `⭐${hotel.reviewScore} (${hotel.reviewScoreWord})` : "No score yet";
        // Creating hotel card element with data retrieved from API
        let hotelCard = 
             `
              <div class="card-hotel" data-id=${hotel.hotelId}>
                   <div class="card-image">
                       <img class="card-img-top" src=${hotel.hotelPhoto} alt="Hotel picture">
                   </div>
                   <div class="card-content">
                       <div class="card-body">
                           <h5>${hotel.hotelName}</h5>
                           <p class="card-text">Address: ${hotel.hotelAddressRoad}, <span> ${hotel.hotelAddressPostal}</span></p>
                           <p class="card-text">Price: £${Math.round(hotel.hotelNightPrice)}</p>
                           <p class="card-text">${reviewScore}</span></p>
                       </div>
                       <div class="card-footer">
                           <a class="btn btn-info" href="${hotel.bookingComLink}" target="_blank">Book Now</a>
                           <button class="btn btn-info getPhoto-btn">Photos</button>
                           <button type="button" class="btn btn-info open-map" data-toggle="modal" data-target="#mapModal"
                                   data-name=${hotel.hotelName} data-lat="${hotel.hotelLat}" data-lon="${hotel.hotelLon}"
                                  data-address="${hotel.hotelAddressRoad}, ${hotel.hotelAddressPostal}">
                               Show on Map
                           </button>
                           <button class="btn btn-info getRestaurant" data-target="#mapModal" data-lat="${hotel.hotelLat}" data-lon="${hotel.hotelLon}">Find nearby restaurants</button>
                           <button class="btn btn-info saveFavourite"><i class="${heartClass} heart-icon" style="${heartColor}"></i></button>
                           </div>
                   </div>
               </div>
             `;
        // Append card to main container in HTML
        hotelsContainer.append(hotelCard);
    });
}
updateDOMWithHotels(hotels)



// ----------------- End of Testing Function ---------------------------------------------------------

// Function to save all data retrieved from fetch to global variable
function saveHotelData(processedHotels) {
    processedHotels.forEach(function(hotel) {
        savedHotelData.push(hotel);
    });
}

// New function to remove/add items based on click of the heart
function saveToFavourites(event) {
    let dataId = $(event.target).closest(".card-hotel").data("id");
    let icon = $(event.target).closest(".saveFavourite").find(".heart-icon");
    let targetHotel = savedHotelData.find(function(element) {
        return element.hotelId == dataId
    } );

    if (!targetHotel) {
        console.error("Hotel not found");
        return;
    }

    let savedHotels = localStorage.getItem("savedHotels");
    savedHotels = savedHotels ? JSON.parse(savedHotels) : [];

    let hotelIndex = savedHotels.findIndex(function(hotel) {
        return hotel.hotelId === targetHotel.hotelId;
    })

    // Toggle favorite state
    if (icon.hasClass("fa-regular")) {
        // Add to favorites
        icon.removeClass("fa-regular fa-heart").addClass("fa-solid fa-heart").css("color", "#be2323");
        if (hotelIndex === -1) {
            savedHotels.push(targetHotel);
            appendToFavorites(targetHotel);
        }
    } else {
        // Remove from favorites
        icon.removeClass("fa-solid fa-heart").addClass("fa-regular fa-heart").css("color", "");
        if (hotelIndex !== -1) {
            savedHotels.splice(hotelIndex, 1);
            removeFromFavorites(targetHotel.hotelId);
        }
    }

    localStorage.setItem("savedHotels", JSON.stringify(savedHotels));
}


function appendToFavorites(hotel) {
        let favouriteHotel = 
        `
        <div class="favourite-card" data-hotel-id="${hotel.hotelId}">
            <div class=favourite-image>
                <img src="${hotel.hotelPhoto}">
            </div>
            <div class="favourite-text">
                <p>${hotel.hotelName}</p>
                <p>⭐${hotel.reviewScore}<span class="fav-price-text">£${Math.round(hotel.hotelNightPrice)}</span></p>
            </div>
            <div>
                <button><i class="fa-solid fa-trash remove-btn"></i></button>
            </div>
        </div>
    `
        $(".favourite-container").append(favouriteHotel);
}

function removeFromFavorites(hotelId) {
        $(".favourite-container").find(`div[data-hotel-id='${hotelId}']`).remove();
}


function removeFavourites(event) {

    // Getting the whole favourite card element based on which buttons was clicked
    let favClicked = event.target
    let cardElement = $(favClicked).closest(".favourite-card");
    let divHotelId = cardElement.attr("data-hotel-id");
    
    // Remove entire favourite-card
    cardElement.remove();

    // Retrieve data from local storage of saved hotels
    let localStorageData = localStorage.getItem("savedHotels")
    localStorageHotels = JSON.parse(localStorageData)
    
    // Find a matching hotel id with the one on favourite-card, if match = true otherwise returns -1
    let index = localStorageHotels.findIndex(function(hotel) {
        // I did not use "===" because hotel.hotelId it's a number and "divHotelId" it's a data attribute which is string
        return hotel.hotelId == divHotelId;
    })
    
    // Check if we found a match on hotelId
    if (index !== -1) {
        // Use the splice method to remove the element at the 'index' position from the 'localStorageHotels' array. 
        localStorageHotels.splice(index, 1);
        // Update our local storage with array.
        localStorage.setItem("savedHotels", JSON.stringify(localStorageHotels));


        let hotelCard = $(".hotels-container").find(`div[data-id='${divHotelId}']`);

        // Check if the hotel card was found
        if (hotelCard.length) {
            // Find the .heart-icon within the .saveFavourite element of the hotel card
            let heartIcon = hotelCard.find(".saveFavourite .heart-icon");
            heartIcon.removeClass("fa-solid fa-heart")
                     .addClass("fa-regular fa-heart")
                     .css("color", "");
        };
    } else {
        console.log("This hotel was not saved in localStorageHotels.")
    }
    
}

function fetchSavedLocalStorage() {
    let favouriteContainer = $(".favourite-container");
    let savedHotels = localStorage.getItem("savedHotels");
    
    hotelData = JSON.parse(savedHotels)
    

    if (savedHotels) {
       
        hotelData.forEach(function(element) {
            let favouriteHotel = 
            `
                <div class="favourite-card" data-hotel-id="${element.hotelId}">
                    <div class=favourite-image>
                        <img src="${element.hotelPhoto}">
                    </div>
                    <div class="favourite-text">
                        <p>${element.hotelName}</p>
                        <p>⭐${element.reviewScore}<span class="fav-price-text">£${Math.round(element.hotelNightPrice)}</span></p>
                    </div>
                    <div>
                        <button><i class="fa-solid fa-trash remove-btn"></i></button>
                    </div>
                </div>
            `
        favouriteContainer.append(favouriteHotel);
        })
    } else {
        return;
    }
    
}

$(".container").on("click", ".getPhoto-btn", function() {

    // Use closest to get closest parent element with class .hotel and extract data attribute data-id
    let hotelId = $(this).closest(".card-hotel").data("id")

    getHotelPhotos(hotelId)
        .then(function(photos) {

            // Limit of photos to display to 10
            let limitPhotos = photos.slice(0,10);

            // Remove previous modal added to the document
            $("#photoModal").remove();

            // Loop through the array received from API and create modal with photos of the hotel
            let modalPictures = `
            <div class="modal fade" id="photoModal" tabindex="-1" role="dialog" aria-labelledby="photoModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-custom" role="document">
                    <div class="modal-content center">
                        <div class="modal-header">
                            <h5 class="modal-title" id="photoModalLabel">Photos</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body modal-body-gallery">
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
}
)


// Event handlers for buttons click
$(function() {
    fetchSavedLocalStorage();
    
    // Update the map with the address of the selected hotel when the "view on map" button is clicked
    $(".hotels-container").on("click", ".open-map", function() {
        let hotelName = $(this).data("name");
        let hotelLat = $(this).data("lat");
        let hotelLon = $(this).data("lon");
        let hotelAddress = $(this).data("address")

        updateMapWithAddress(hotelAddress);
    });

    // Update the map and display nearby restaurants when the "show restaurants" button is clicked
    $(".hotels-container").on("click", ".getRestaurant", function() {
        const lat = parseFloat($(this).data("lat"));
        const lon = parseFloat($(this).data("lon"));
    
        // If the coordinates are in the correct format, update the map and find nearby restaurants
        if (!isNaN(lat) && !isNaN(lon)) {
            updateMapWithCoordinates(lat, lon);
            findNearbyRestaurants(new google.maps.LatLng(lat, lon));
            $('#mapModal').modal('show');
        } else {
            console.error("Invalid hotel position");
        }
    });

    $(".hotels-container").on("click", ".saveFavourite", function(event) {
        // Stop the event from bubbling up to parent elements
        event.stopPropagation();

        saveToFavourites(event);
    })

    $(".favourite-container").on("click", ".remove-btn", function(event) {
        // Stop the event from bubbling up to parent elements
        event.stopPropagation();

        removeFavourites(event);
    })
    
})


// getHotel("London");
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';

import { environment } from 'src/environments/environment'

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  // Google Maps APIs \\
  private loader: Loader;
  private map!: google.maps.Map;
  private marker!: google.maps.Marker;

  // Default Values \\
  private default_zoom_lvl: number = 13;
  // Amman
  private default_center_loc = {
    Latitude: 31.963158, Longitude: 35.930359
  };

  // Misc \\
  isLoading: boolean = false;
  addressErrorMsg: string = "";
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @ViewChild('addressSearch') addressSearch!: ElementRef;

  constructor() {
    // when first construct the component get a Google Map Loader
    // utility helps with injecting google maps APIs scripts dynamicly (when needed)   
    this.loader = this.getGoogleMapJSLoader();
  }

  ngOnInit(): void {
    // each time initializing the component do these... 
    // for showing loading a spinner on the HTML
    this.isLoading = true;

    // initiate the loading of google maps scripts "maps library"
    // then after the maps library's scripts are ready to use initilize the map
    this.loader.importLibrary("maps").then(() => {
      this.initMap();
    });

    // initiate the loading of google maps scripts "places library"
    // and add the autocomplete feature to the map
    this.loader.importLibrary("places").then(() => {
      new google.maps.places.Autocomplete(this.addressSearch.nativeElement);
    });
  }

  private initMap(): void {
    // try to get the current user's position else use the default one.
    let initialPosition = this.getInitialMapsPosition();

    // create and initilize new map with initial position and zoom lvl
    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      zoom: this.default_zoom_lvl,
      center: initialPosition
    });
  }

  // alter the map with the new address information
  searchAddress(address: string): void {
    address.trim();
    // address is not valid do not procceed
    if (!this.isValidAddress(address)) {
      this.addressErrorMsg = "address cannot be empty";
      return;
    }

    // get geocoder and send geocode request
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      // request successed but no address information found 
      if (status === 'ZERO_RESULTS') {
        this.addressErrorMsg = `address not found: ${address}.`
        return;
      }

      // request successed and address information found
      if (status === 'OK' && results !== null && results[0]) {
        const location = results[0].geometry.location;
        this.alterMapOptions(location.lat(), location.lng());
        this.setMarkerOnMap(location.lat(), location.lng(), results[0].formatted_address);
        return;
      }

      // request failed for some reason
      this.addressErrorMsg = 'an error occurred while proccessing your request, please try again';
      console.error(`an error occurred while proccess this request: ${status}`);
    });

    this.addressErrorMsg = "";
  }

  private alterMapOptions(newLat: number, newLng: number): void {
    this.map.setOptions({
      center: {
        lat: newLat, lng: newLng
      },
      zoom: this.default_zoom_lvl
    });
  }

  private setMarkerOnMap(latitude: number, longitude: number, markerTitle: string): void {
    const markerIconURL: string = 'assets/icons/vector-location-icon.png';
    const markerIconSize = new google.maps.Size(40, 40);

    // if there is already a marker remove the map
    if (this.marker) {
      this.marker.setMap(null);
    }

    // assemble new marker and put it on the map
    this.marker = new google.maps.Marker({
      position: {
        lat: latitude, lng: longitude
      },
      map: this.map,
      title: markerTitle,
      icon: {
        url: markerIconURL,
        scaledSize: markerIconSize
      }
    });
  }

  // returns the current user's position or default one if user's position not gatherable.
  private getInitialMapsPosition(): google.maps.LatLng {
    let userPosition = this.getCurrentUserPosition();
    if (userPosition === undefined) {
      return new google.maps.LatLng(this.default_center_loc.Latitude, this.default_center_loc.Longitude);
    }

    return userPosition;
  }

  // returns the current user's position or undefined
  private getCurrentUserPosition(): google.maps.LatLng | undefined {
    // if geolocation is supported by the user's browser
    // then use navigator browser API to get current user's Position
    // lat lng as google.maps.LatLng 
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      return undefined;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        return new google.maps.LatLng(latitude, longitude);
      },
      error => {
        console.error(`The user did not give his browser a permission for getting its location: ${error.code}`);
      }
    );

    return undefined;
  }

  // returns ready to use google map loader
  private getGoogleMapJSLoader(): Loader {
    return new Loader({
      apiKey: environment.googleMapAPI,
      version: 'weekly'
    });
  }

  private isValidAddress(address: string): boolean {
    return address.trim().length !== 0;
  }
}
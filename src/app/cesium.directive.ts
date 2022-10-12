import { Directive, ElementRef, OnInit, ViewRef } from '@angular/core';
import { throws } from 'assert';
import * as Cesium from 'cesium';
import { Console } from 'console';
import * as csvParse from 'csv-parse';
import satelliteData from '../../src/assets/json/SatelliteData.json'
import { CatalogueKep } from './Catalogue';
import { Satellite } from './Satellite';
import charlesSatellites from '../../src/assets/json/CharlesSatellites.json'

@Directive({
  selector: '[appCesium]'
})
export class CesiumDirective implements OnInit 
{
  public viewer;
  private time!: Cesium.JulianDate;
  private pointCollection: Cesium.PointPrimitiveCollection;
  private catalogue: CatalogueKep = new CatalogueKep();

  constructor(private el: ElementRef) {
    this.viewer = new Cesium.Viewer(this.el.nativeElement);
    this.pointCollection = new Cesium.PointPrimitiveCollection();
  }

  ngOnInit(): void {
    // create a catalogue and return a point collection
    var importedSatellites:Array<Satellite> = this.catalogue.CreateCatalogue();
    importedSatellites.forEach((item) => {
      this.pointCollection.add({
        position: Cesium.Cartesian3.fromDegrees(0.0, 0.0),
        pixelSize: 3, 
        color: Cesium.Color.YELLOW,
      })
    })

    charlesSatellites.forEach((item) => {
      this.pointCollection.add({
        position : Cesium.Cartesian3.fromDegrees(item['ECI X (km)'], item['ECI Y (km)'], item['ECI Z (km)']*1000)
      })
    })

     

    this.viewer.scene.primitives.add(this.pointCollection); 
    // Initialise Cesium Parts
    //this.SetUpInitialCesiumConditions();
  }

  private SetUpInitialCesiumConditions() {
    // Enable Depth so things behind the terrain disappear. 
    this.viewer.scene.globe.depthTestAgainstTerrain = true;
    this.viewer.scene.globe.enableLighting = true;
    this.viewer.clock.multiplier = 100;

    // Starting timing conditions for the viewer
    var startTimeJD = Cesium.JulianDate.now();
    this.time = this.viewer.clock.currentTime;
    this.viewer.clock.startTime = Cesium.JulianDate.now();
    this.viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;
    this.viewer.timeline.zoomTo(startTimeJD, Cesium.JulianDate.addSeconds(startTimeJD, 86400, new Cesium.JulianDate()));

    // Subscribe the Viewer to the rotating earth
    this.viewer.scene.postUpdate.addEventListener(() => {
      if (this.viewer.scene.mode !== Cesium.SceneMode.SCENE3D) 
      {
          return;
      }

      var icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(this.time);
      if (Cesium.defined(icrfToFixed)) 
      {
          var camera = this.viewer.camera;
          var offset = Cesium.Cartesian3.clone(camera.position);
          var transform = Cesium.Matrix4.fromRotationTranslation(icrfToFixed);
          camera.lookAtTransform(transform, offset);
      }
    });

    // Also update the debris collection with time
    this.viewer.scene.postUpdate.addEventListener(() => {

      this.time = this.viewer.clock.currentTime;
      var tai_utc = Cesium.JulianDate.computeTaiMinusUtc(this.time);
      var time_utc = Cesium.JulianDate.now();
      Cesium.JulianDate.addSeconds(this.time, tai_utc, time_utc);
      var icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time_utc);
      var time_date_js = Cesium.JulianDate.toDate(time_utc); /// convert time into js Date()

      var position_ecef = new Cesium.Cartesian3();
      var pos_radar_view = new Cesium.Cartesian3();

      satelliteData.forEach((item) => {
        this.pointCollection.add({
          position: Cesium.Cartesian3.fromDegrees(0.0, 0.0),
          pixelSize: 3, 
          color : Cesium.Color.RED
        })
      })

       for(var i = 0; i < this.pointCollection.length; i++){
         var point = this.pointCollection.get(i);
         if (Cesium.defined(icrfToFixed)) {
      
          // using keplerian propogation, with time find the new position and velocities.
          var positionAndVelocity = this.catalogue.ComputeDebrisPositionECI(i, time_date_js);
          var positionECI = new Cesium.Cartesian3(positionAndVelocity.position.x*1000,positionAndVelocity.position.y*1000,positionAndVelocity.position.z*1000);
          position_ecef = Cesium.Matrix3.multiplyByVector(icrfToFixed, positionECI, position_ecef);
          Cesium.Cartesian3.clone(position_ecef,pos_radar_view);
          point.position = position_ecef; //// update back
         }
       }
    })
  }
}

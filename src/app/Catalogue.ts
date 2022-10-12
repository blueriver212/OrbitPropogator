import Cesium3DTile from 'cesium/Source/Scene/Cesium3DTile';
import satelliteData from '../../src/assets/json/SatelliteData.json'
import * as Cesium from 'cesium';
import { KeplerianElements } from './KeplerianElements';
import { Satellite } from './Satellite';
import { PositionAndVelocity } from './PostionVelocityVector';
import PointPrimitiveCollection from 'cesium/Source/Scene/PointPrimitiveCollection';

export class CatalogueKep
{
    private Satellites:Array<Satellite> = new Array<Satellite>();
    
    // Currently this will only work for keplerian elements
    constructor() {}

    public CreateCatalogue(): Array<Satellite>{
        // Initialise the array, in this case it will just load local data
        var isat = -1;
        satelliteData.forEach((item) => {
            isat++;
            var epoch_of_orbit_str = item.epoch_of_orbit;		
            var t0_str = epoch_of_orbit_str.split("-");
            var month = parseInt(t0_str[1])-1;

            var individualSatellite: Satellite = {
                id : isat,
                epoch_of_orbit: new Date(parseInt(t0_str[0]),month,parseInt(t0_str[2])),
                semi_major_axis: item['Semi-Major Axis (km)'],
                eccentricity: item.Eccentricity,
                inclination: item['Inclination (rad)'],
                RAAN: item['RAAN (rad)'], 
                perigee: item['Arg of Perigee (rad)'],
                true_anomaly: item['True Anomaly (rad)']
            }

            this.Satellites.push(individualSatellite);
        })

        // reset isat
        isat = -1;
        return this.Satellites;
    }

    public ComputeDebrisPositionECI(i:number, time_date_js:Date) {
        // Propograte the object's position

        // Create empty vector
        var positionVelocityVector:PositionAndVelocity = new PositionAndVelocity

        if (i < this.Satellites.length){
            var iSatellite:Satellite = this.Satellites.find(item => item.id == i)!;
            
            // Instance of Kep Elements for the propogation
            var kepElements = new KeplerianElements(iSatellite);
            
            // Get the time step
            var tt0:Date = iSatellite.epoch_of_orbit;
            var time = new Date(time_date_js.toString());
            var timeDiff = (time.getTime() - tt0.getTime())/ 1000.0; // seconds
            
            kepElements.UpdateElementsGivenTimeStep(timeDiff);
            var positionalVector = kepElements.GetStateVector();
            
        
            positionVelocityVector.SetPositionAndVelocityVector(positionalVector[0], positionalVector[1], positionalVector[2],
                positionalVector[3], positionalVector[4], positionalVector[5])
		
			return positionVelocityVector.ReturnPositionVelocityVector();
        }

        return positionVelocityVector.ReturnPositionVelocityVector();
    }
}

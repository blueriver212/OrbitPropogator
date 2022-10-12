import { NgPlural } from "@angular/common";
import { RadioControlValueAccessor } from "@angular/forms";
import { randomFillSync } from "crypto";
import { copyFileSync } from "fs";
import type { Satellite } from "./Satellite";

export class KeplerianElements{

    // Core Keplerian Elements
    a : number =  0.0; // semi-major axis
	e : number = 0.0; // eccentricity
	i : number = 0.0; // inclination
	OMEG :number  = 0.0; // RAAN, Right Ascension of ascending node
	nu : number = 0.0; // true anomaly
	mu : number = 0.0; // argument of per

    // Gravitational Constant
	GM : number = 398600.4415;  // km

    // Keplerian Anomalies
    eccentricAnomaly!: number;
    meanAnomaly!: number;
    trueAnomaly!: number;

    // Time 
    averageAngularSpeed!: number;
    timeStep!: number;  

    constructor(satellite:Satellite) {
        this.a = satellite.semi_major_axis;
        this.e = satellite.eccentricity;
        this.i = satellite.inclination;
        this.OMEG = satellite.RAAN;
        this.nu = satellite.true_anomaly;
        this.mu = satellite.perigee;
    }

    public UpdateElementsGivenTimeStep(time:number) {
        // The Mean Motion
        var n:number = this.calculateMeanMotion();

        // Eccentric Anomaly
        var E:number = this.calculateEccentricAnomaly(1*Math.exp(-7))

        // The Mean Anomaly at Time 0
        var M0:number = this.getMeanAnomalyFromEccentricAnomaly(E);

        var Mt = M0 + (n*time);

        // Update the True Anomaly
        var ecan_t  = this.getEccentricAnomalyFromMean(Mt, this.e);
        var tran_t = this.getTrueAnomalyFromEccentricAnomaly(ecan_t, this.e);
        
        // The True Anomaly
        this.mu = tran_t;
    }

    /* 
    The mean motion is the time-average angular velocity over an orbit. 
    */
    private calculateMeanMotion(): number {
        var n = Math.sqrt(this.GM/this.a)/this.a;
        return n;
    }

    /* 
    Kepler's Third Law states that T = 2.pi (sqrt(a^3/GM)) where T is the orbital period, a is the semi-major axis and GM is the gravitational constant of what is being orbited. 
    We find the average angular speed with n = 2.pi/T radians/second. 
    In general, 
    n = sqrt(GM/a^3) is the average angular speed, or mean motion of the orbiting body.

    Think about it, your mean motion, is the orbit (2 pi) divided by the length of time (T) of the orbit. 

    Units are normally rad/sec. 
    */
    private calculate_average_angular_speed() {
        this.averageAngularSpeed = Math.sqrt(this.GM/(this.a)^3);
    }

    /* 
    You will need to use a root solving method to calculate eccentric anomaly, E. 

    M = E eSin(E) => Since there is no closed solution to find E. You have to iteratively solve for E. 

    This hould be set up by root solving by subtracting M from btoh sides of the equation where is equals 0 as a function of E. 

    f(E) => E-esin(E) - M = 0

    f'(E) = 1 - ecos(E)

    With these two equations, values for the mean anomaly, eccentricity and in initial guess for eccentric anomaly (this can be 0), the Newton roote Solver will calculate a solution. 

    A practical method for solving:
    http://murison.alpheratz.net/dynamics/twobody/KeplerIterations_summary.pdf
    */
    private calculateEccentricAnomaly (tolerance:number){
        // should always have eccentricity (e) and mean anomaly (M) and a tolerance level
        var E:number;
        var M:number = this.nu;

        // Initial guess of the value of E
        if (M < Math.PI) {
            E = M + (this.e / 2); 
        } else {
            E = M - (this.e / 2);
        }
   
        // STARTING CONDITIONS
        var f = E - this.e * Math.sin(E) - M;
        var f_prime = 1 - this.e * Math.cos(E);
        var ratio = f/f_prime;
        
        // Keep reducing the value of E until F and F Prime is nearly 0.
        while (Math.abs(ratio) > tolerance) {
            f = E - this.e * Math.sin(E) - M;
            f_prime = 1 - this.e * Math.cos(E);
            ratio = f / f_prime;
            if (Math.abs(ratio) > tolerance) {
                E = E - ratio;
            } else {
                break;
            }
        }
        return E;
    }

    private getEccentricAnomalyFromMean(mean:number, ecc:number){
        var E1=0, E2=0; // initial estimate, improved estimate

        var tol = 1.0E-9; // maximum difference allowed
        var count = 0;
        E2 = mean;  

        //apply fixed point iteration
        while(1)
        {
            E1 = E2;
            E2 = mean + ecc * Math.sin(E1);
            count = count+1;
            
            if(Math.abs(E1 - E2) < tol)
            {
                break;
            }

            if(count >3)
            {
                break;
            }
        }
       var ecan = E2;
       return ecan;
    }

    private getTrueAnomalyFromEccentricAnomaly(EccentricAnomaly:number, ecc:number){

        var sin_tran, cos_tran;
    
            // Not named correctly, these are both missing a division by (1 - ecc*cos(ecan))
         sin_tran = Math.sqrt(1.0 - ecc * ecc) * Math.sin(EccentricAnomaly);
         cos_tran = Math.cos(EccentricAnomaly) - ecc;
    
            // But we don't do the division as it will cancel out in here anyway
         var tran = Math.atan2(sin_tran, cos_tran);
    
         if (tran < 0.0)
         {
            var twopi = 2.0*Math.PI;
            tran += twopi; // Bring E into range 0 to 2PI
         }
    
         return tran;
    }

    private get_ecan_from_tran(eccentricity:number, true_anomaly:number)
	{
		var sin_ecan, cos_ecan;
        var twopi = Math.PI*2.0;
        
		// Not named correctly, these are both missing a division by (1 + ecc*cos(tran))
        sin_ecan = Math.sqrt(1.0 - eccentricity * eccentricity) * Math.sin(true_anomaly);
        cos_ecan = Math.cos(true_anomaly) + eccentricity;

        // But we don't do the division as it will cancel out in here anyway
        var ecan = Math.atan2(sin_ecan, cos_ecan);

        if ( ecan < 0.0)
        {
            ecan += twopi; // Bring E into range 0 to 2PI
        }
        return ecan;
	}

    private getMeanAnomalyFromEccentricAnomaly(EccentricAnomaly:number) {
        var mean = EccentricAnomaly - this.e * Math.sin(EccentricAnomaly);
        return mean;
    }

    private calculate_mean_anomaly() {
        this.meanAnomaly = this.averageAngularSpeed * this.timeStep;
    } 

    public GetStateVector()
	{
		// state vector, position and velocity
		var pos_vel = new Array(6);

		var sqrt1me2 = Math.sqrt(1.0 - this.e * this.e);
		var ecan = this.get_ecan_from_tran(this.e, this.nu);
		var cos_ecan = Math.cos(ecan);
        var sin_ecan = Math.sin(ecan);

        // Compute the magnitude of the Gaussian vectors at the required point
        var gaussX = this.a * (cos_ecan - this.e);    // Magnitude of
        var gaussY = this.a * sqrt1me2 * sin_ecan; // Gaussian vectors

        var XYdotcommon = Math.sqrt(this.GM / this.a) / (1.0 - this.e * cos_ecan);


        var gaussXdot = -sin_ecan * XYdotcommon;           // Gaussian vel.
        var gaussYdot = cos_ecan * sqrt1me2 * XYdotcommon; // components

        var cos_inc = Math.cos(this.i);
        var sin_inc = Math.sin(this.i);

        var cos_argp = Math.cos(this.mu);
        var cos_raan = Math.cos(this.OMEG);

        var sin_argp = Math.sin(this.mu);
        var sin_raan = Math.sin(this.OMEG);

        var cc = cos_argp * cos_raan;
        var cs = cos_argp * sin_raan;
        var sc = sin_argp * cos_raan;
        var ss = sin_argp * sin_raan;

        var P = new Array(3);
        var Q = new Array(3);
        P[0] = cc - ss * cos_inc;
        P[1] = cs + sc * cos_inc;
        P[2] = sin_argp * sin_inc;

        Q[0] = -sc - cs * cos_inc;
        Q[1] = -ss + cc * cos_inc;
        Q[2] = cos_argp * sin_inc;


        pos_vel[0] = gaussX * P[0] + gaussY * Q[0];
        pos_vel[1] = gaussX * P[1] + gaussY * Q[1];
        pos_vel[2] = gaussX * P[2] + gaussY * Q[2];

        pos_vel[3] = gaussXdot * P[0] + gaussYdot * Q[0];
        pos_vel[4] = gaussXdot * P[1] + gaussYdot * Q[1];
        pos_vel[5] = gaussXdot * P[2] + gaussYdot * Q[2];

		return pos_vel;
	}
}

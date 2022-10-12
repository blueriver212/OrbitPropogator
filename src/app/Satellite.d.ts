export type Satellite = {
    id: number;
    epoch_of_orbit: Date;
    semi_major_axis: number;
    eccentricity: number;
    inclination: number;
    RAAN: number;
    perigee: number;
    true_anomaly: number;
}
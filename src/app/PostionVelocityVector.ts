type PositionVelocityVector = {
    position:{
        x:number,
        y:number,
        z:number
    },
    velocity:{
        x:number,
        y:number,
        z:number
    };
}

export class PositionAndVelocity {
    private PositionVelocityVector = {
        position:{
            x : 0,
            y : 0,
            z : 0
        },
        velocity:{
            x : 0,
            y : 0,
            z : 0
        }
    }
    constructor(){}
    
    public SetPositionAndVelocityVector(px:number, py:number, pz:number, vx:number, vy:number, vz:number)
    {
        this.PositionVelocityVector.position.x = px;
        this.PositionVelocityVector.position.y = py;
        this.PositionVelocityVector.position.z = pz;

        this.PositionVelocityVector.velocity.x = px;
        this.PositionVelocityVector.velocity.y = py;
        this.PositionVelocityVector.velocity.z = pz;
    }

    public ReturnPositionVelocityVector(){
        return this.PositionVelocityVector;
    }
}
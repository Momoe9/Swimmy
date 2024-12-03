import { useState } from 'react';
import {useFrame,Canvas, extend} from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useControls } from 'leva';
import vshader from './vshader.vert?raw';
import fshader from './fshader.frag?raw';

declare global
{ namespace JSX
 { interface IntrinsicElements
        { "causticsMaterial": any}
 }
}

console.log(new THREE.Vector2(window.innerWidth, window.innerHeight));
function App(){
    return(
         <div style={{width:"100dvh", height:"100dvh"}}>
            <Canvas>
                <Caustics/>
            </Canvas>
        </div>
    )
}


function Caustics(){
    const [utime, setUtime] = useState(0);
    const [nakama,setNakama]=useState([0.0,0.4,0.6]);
    useFrame(() => {
        setUtime(utime+0.01);
        setNakama([0.0,0.4,0.6]);
        //console.log(utime);
      })    
    const {swimmy,cameraX,cameraY} = useControls(
        {   swimmy:{value:0,min:-1,max:1,step:0.05},
            cameraY:{value:5,min:0.3,max:10,step:0.1},
            cameraX:{value:10,min:0.3,max:20,step:0.1}
        }
    )

    return(
        <mesh position={[2,0,0]}>
        <planeGeometry args={[20,20]}/>
        <causticsMaterial
            glslVersion={THREE.GLSL3}
            cameraY={cameraY}
            cameraX={cameraX}
            utime={utime}
            swimmy={swimmy}
            nakama={nakama}
            
        />
        </mesh>
    );

}

const CausticsMaterial =  shaderMaterial(
    {uresolution:new THREE.Vector2(window.innerWidth, window.innerHeight),
        cameraY: 5,
        cameraX: 10,
        utime:0.0,
        swimmy:0,
        nakama:[0.0,0.4,0.6]
    },
    vshader,
    fshader
)
extend({CausticsMaterial});

export default App

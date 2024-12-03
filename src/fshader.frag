precision highp float;

uniform vec2 uresolution;
uniform float cameraY;
uniform float cameraX;
uniform float utime;
uniform float swimmy;
uniform float nakama[100];

out vec4 fragColor;

#define EPS 0.001

float dot2( in vec3 v ) { return dot(v,v); }

//壁
float udQuad( vec3 p, vec3 a, vec3 b, vec3 c, vec3 d )
{
  vec3 ba = b - a; vec3 pa = p - a;
  vec3 cb = c - b; vec3 pb = p - b;
  vec3 dc = d - c; vec3 pc = p - c;
  vec3 ad = a - d; vec3 pd = p - d;
  vec3 nor = cross( ba, ad );

  return sqrt(
    (sign(dot(cross(ba,nor),pa)) +
     sign(dot(cross(cb,nor),pb)) +
     sign(dot(cross(dc,nor),pc)) +
     sign(dot(cross(ad,nor),pd))<3.0)
     ?
     min( min( min(
     dot2(ba*clamp(dot(ba,pa)/dot2(ba),0.0,1.0)-pa),
     dot2(cb*clamp(dot(cb,pb)/dot2(cb),0.0,1.0)-pb) ),
     dot2(dc*clamp(dot(dc,pc)/dot2(dc),0.0,1.0)-pc) ),
     dot2(ad*clamp(dot(ad,pd)/dot2(ad),0.0,1.0)-pd) )
     :
     dot(nor,pa)*dot(nor,pa)/dot2(nor) );
}

float sdfSwimmy( vec3 p, vec3 center)
{
  return (length(p-center)-0.1);
}
float sdfNakama(vec3 p){
  //return min(length(p-vec3(1.0,-0.2,0.5))-0.1,length(p-nakama[1])-0.1);
  return (length(p-vec3(nakama[0],0.5,0.3)-0.1));

}


float sdfWall(vec3 p)
{
  float zwall=udQuad(p, vec3(1,1,-1), vec3(-1,1,-1),vec3(-1,-1,-1), vec3(1,-1,-1));  
  float xwall=udQuad(p, vec3(-1,1,1), vec3(-1,1,-1),vec3(-1,-1,-1), vec3(-1,-1,1));
  float ywall=udQuad(p, vec3(1,-1,1), vec3(-1,-1,1),vec3(-1,-1,-1), vec3(1,-1,-1));
  float sw=sdfSwimmy(p, vec3(swimmy,-0.5,0));
  float n=sdfNakama(p);
  return(min(min(min(min(zwall,xwall),ywall),sw),n));
}

float sdfSurface(vec3 p){
  return(p.y - 0.05*cos(10.0*(p.x*p.x+p.z*p.z-3.0*utime)));
  //return(p.y - 0.05*cos(10.0*(p.x*p.x+p.z*p.z)));
}

float sdf(vec3 p)
{
  float waterSurface = udQuad(p, vec3(1,0,1), vec3(-1,0,1),vec3(-1,0,-1), vec3(1,0,-1));
  return(min(sdfWall(p),waterSurface));
  //return(min(sdfWall(p),sdfSurface(p)));
}

vec3 sdfNormal(vec3 p){
  float dx = sdf(p+vec3(EPS,0,0))-sdf(p);
  float dy = sdf(p+vec3(0,EPS,0))-sdf(p);
  float dz = sdf(p+vec3(0,0,EPS))-sdf(p);

  return(normalize(vec3(dx,dy,dz)));
}


vec3 surfaceNormal(vec3 p){
  float dx = sdfSurface(p+vec3(EPS,0,0))-sdfSurface(p);
  float dy = sdfSurface(p+vec3(0,EPS,0))-sdfSurface(p);
  float dz = sdfSurface(p+vec3(0,0,EPS))-sdfSurface(p);

  return(normalize(vec3(dx,dy,dz)));
}

vec3 rayStep(vec3 p, vec3 ray){
    return(p + sdf(p)*ray);
}

vec3 rayMarching(vec3 s, vec3 ray){
  vec3 p = s;
  for (int i=0; i<50; i++){
    if (sdf(p)<0.001){
      return(p);
    }
    p = rayStep(p, ray);
  }
  return(p);
}

vec3 rayStepWater(vec3 p, vec3 ray){
    return(p + sdfWall(p)*ray);
}

vec3 rayMarchingWater(vec3 s, vec3 ray){
  vec3 p = s;
  for (int i=0; i<50; i++){
    if (sdfWall(p)<0.001){
      return(p);
    }
    p = rayStepWater(p, ray);
  }
  return(p);
}

bool waterSurface(vec3 pt){
  return((pt.y<0.01) && (pt.y>-0.01));
}

vec4 wallColor(vec3 pt){
  float density = 10.0;
  vec3 mod1 = mod(density*(pt+100.0), 1.0);

  if(abs(sdfSwimmy(pt,vec3(swimmy,-0.5,0)))<0.01){
    return (vec4(1,0,0,1));
  }

  if ((mod1.x < 0.08 && mod1.x > 0.02) ||
      (mod1.y < 0.08 && mod1.y > 0.02) ||
      (mod1.z < 0.08 && mod1.z > 0.02)){
    return(vec4(0.3,0.3,0.3,1));
  }
  else{
    return(vec4(0.5,0.5,0.5,1));
  }
}

vec3 Refraction(vec3 I, vec3 N, float e)
{
  float cos_theta = dot(-I, N);
  float cos_phi2 = 1.0-e*e*(1.0-cos_theta*cos_theta);
  vec3 T = e*(I+N*cos_theta)-N*sqrt(abs(cos_phi2));
  if (cos_phi2 > 0.0){
    return(normalize(T));
  }
  else{
    return(vec3(0.0));
  }
}

void main(){
  vec2 p = gl_FragCoord.xy / uresolution.x;
  float mag = 1.5;
  p = (2.0*mag)*p;
  p -= vec2(mag,mag*uresolution.y/uresolution.x);

  vec3 camera = vec3(cameraX,cameraY,10);
  vec3 to = -camera;
  vec3 a1 = normalize(vec3(to.y, -to.x,0));
  vec3 a2 = normalize(vec3(to.x*to.z, to.y*to.z, -(to.x*to.x+to.y*to.y)));
  vec3 y = vec3(0,1,0);
  vec3 up = dot(y,a1)*a1 + dot(y,a2)*a2;
  vec3 right = -normalize(cross(-to,up));
  vec3 ray = normalize(p.x*right+p.y*up-camera);
  vec3 light = vec3(cameraX, cameraY, 20);

  vec3 pt = rayMarching(camera, ray);
  vec3 wallpt;
  if (waterSurface(pt)){
    ray = refract(ray, surfaceNormal(pt), 0.9);
    //ray = Refraction(ray, vec3(0,1,0), 0.9);
    wallpt = rayMarchingWater(pt, ray);
  }
  if (sdf(pt)<0.001){
    float intensity=0.5+0.5*dot(normalize(light-pt),sdfNormal(pt));
    vec4 col = wallColor(wallpt);
    if (waterSurface(pt)){
      intensity=0.5+0.5*dot(normalize(light-pt),surfaceNormal(pt));
      fragColor = intensity*vec4(0.7*col.x, 0.7*col.y, 1.0*col.z, 1.0);
    }
    else if (pt.y < 0.0){
      vec4 colW = wallColor(pt);
      fragColor = vec4(0.7*colW.x, 0.8*colW.y, 1.0*colW.z, 1.0);
    }
    else{
      fragColor = wallColor(pt);
    }
  }
  else{
    fragColor=vec4(0,0,0,1);
  }

}

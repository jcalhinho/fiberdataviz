import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Billboard, Environment, OrbitControls, RoundedBox, Text } from '@react-three/drei';
import { animated, useSpring, config } from '@react-spring/three';
import * as THREE from 'three';
import { FiAlertCircle, FiHelpCircle, FiList, FiSettings, FiX } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';


function generateRandomMonthlyDistribution(total: number, months: number = 12): number[] {
  const raw = Array.from({ length: months }, () => Math.random());
  const sum = raw.reduce((acc, val) => acc + val, 0);
  
  const distribution = raw.map(val => Math.round((val / sum) * total));

  
  const diff = total - distribution.reduce((acc, val) => acc + val, 0);
  distribution[0] += diff; 
  return distribution;
}

const socialDataFull = [
  { network: 'X', posts: 82000000, color: 'cyan' },
  { network: 'Instagram', posts: 30000000, color: 'magenta' },
  { network: 'Facebook', posts: 25000000, color: 'blue' },
  { network: 'LinkedIn', posts: 5000000, color: 'navy' },
  { network: 'Snapchat', posts: 8000000, color: 'yellow' },
  { network: 'TikTok', posts: 45000000, color: 'lightblue' },
  { network: 'Reddit', posts: 7000000, color: 'orange' },
  { network: 'Pinterest', posts: 4000000, color: 'red' },
  { network: 'YouTube', posts: 20000000, color: 'darkred' },
  { network: 'Tumblr', posts: 2000000, color: 'purple' },
  { network: 'WhatsApp', posts: 15000000, color: 'green' },
  { network: 'WeChat', posts: 10000000, color: 'teal' },
  { network: 'Threads', posts: 1500000, color: 'pink' },
  { network: 'Line', posts: 2000000, color: 'brown' },
  { network: 'Telegram', posts: 3000000, color: 'skyblue' },
  { network: 'Discord', posts: 4000000, color: 'indigo' },
  { network: 'Clubhouse', posts: 1000000, color: 'lavender' },
  { network: 'Flickr', posts: 500000, color: 'coral' },
  { network: 'Periscope', posts: 1000000, color: 'olive' },
  { network: 'Mix', posts: 800000, color: 'goldenrod' },
].map(item => ({
  ...item,
  // Génère une distribution mensuelle inégale, dont la somme est égale à la valeur annuelle
  monthlyPosts: generateRandomMonthlyDistribution(item.posts)
}));

/**
 * La fonction mise à jour qui génère le mapping par Top,
 * en convertissant les posts annuels et mensuels en millions.
 */
const generateSocialDataMap = () => {
  const map: { [key: number]: typeof socialDataFull } = {};
  const topCounts = [4, 6, 8, 12, 20];

  topCounts.forEach((count) => {
    map[count] = socialDataFull
      .slice(0, count)
      .map((item) => {
        const yearlyPostsInMillions = Math.round(item.posts / 1000000);
        const monthlyPostsInMillions = item.monthlyPosts.map(monthlyPost =>
          Math.round(monthlyPost / 1000000)
        );
        return {
          ...item,
          posts: yearlyPostsInMillions,
          monthlyPosts: monthlyPostsInMillions,
        };
      });
  });

  return map;
};


const socialDataMap = generateSocialDataMap();
function get3DLayout(numFaces: number, geometry: THREE.BufferGeometry) {
  if (numFaces === 6) {
    return [
      { center: new THREE.Vector3(0, 0, 0.5), normal: new THREE.Vector3(0, 0, 1) },
      { center: new THREE.Vector3(0, 0, -0.5), normal: new THREE.Vector3(0, 0, -1) },
      { center: new THREE.Vector3(0, 0.5, 0), normal: new THREE.Vector3(0, 1, 0) },
      { center: new THREE.Vector3(0, -0.5, 0), normal: new THREE.Vector3(0, -1, 0) },
      { center: new THREE.Vector3(0.5, 0, 0), normal: new THREE.Vector3(1, 0, 0) },
      { center: new THREE.Vector3(-0.5, 0, 0), normal: new THREE.Vector3(-1, 0, 0) },
    ];
  }
  return generateFaceData(geometry).map((d) => ({
    center: new THREE.Vector3(d.center[0], d.center[1], d.center[2]),
    normal: new THREE.Vector3(d.normal[0], d.normal[1], d.normal[2]).normalize(),
  }));
}

/**
 * Exemple de fonction generateFaceData pour regrouper les triangles en fonction de leur normale.
 */
function generateFaceData(geometry: THREE.BufferGeometry) {
  const positionAttr = geometry.getAttribute('position');
  const normalAttr = geometry.getAttribute('normal');

  type FaceGroup = { centers: THREE.Vector3[]; normal: THREE.Vector3 };
  const groups: FaceGroup[] = [];
  const tolerance = 0.1;

  for (let i = 0; i < positionAttr.count; i += 3) {
    const v0 = new THREE.Vector3(
      positionAttr.getX(i),
      positionAttr.getY(i),
      positionAttr.getZ(i)
    );
    const v1 = new THREE.Vector3(
      positionAttr.getX(i + 1),
      positionAttr.getY(i + 1),
      positionAttr.getZ(i + 1)
    );
    const v2 = new THREE.Vector3(
      positionAttr.getX(i + 2),
      positionAttr.getY(i + 2),
      positionAttr.getZ(i + 2)
    );
    const center = new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3);
    const triNormal = new THREE.Vector3(
      normalAttr.getX(i),
      normalAttr.getY(i),
      normalAttr.getZ(i)
    ).normalize();

    let found = false;
    for (const g of groups) {
      if (triNormal.angleTo(g.normal) < tolerance) {
        g.centers.push(center);
        found = true;
        break;
      }
    }
    if (!found) {
      groups.push({ centers: [center], normal: triNormal.clone() });
    }
  }

  const faceData: { center: [number, number, number]; normal: [number, number, number] }[] = [];
  groups.forEach((g) => {
    const avg = new THREE.Vector3();
    g.centers.forEach((c) => avg.add(c));
    avg.divideScalar(g.centers.length);
    faceData.push({
      center: [avg.x, avg.y, avg.z],
      normal: [g.normal.x, g.normal.y, g.normal.z],
    });
  });
  return faceData;
}


function get2DLayout(count: number) {
  // On définit un espacement constant (ici 1) et on centre le tout.
  const spacing = 0.7;
  const startX = -((count - 1) * spacing) / 2;
  const layout = [];
  for (let i = 0; i < count; i++) {
    const x = startX + i * spacing;
   
    layout.push({
      center: new THREE.Vector3(x, 0, 0),
      
      normal: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
    });
  }
  return layout;
}






interface SubdividingBlockProps {
  numFaces: number;
  isUnfolded: boolean;
  toggleUnfold: () => void;
  highlightedNetwork: string | null;
  showMonthly: boolean;
}

const SubdividingBlock = ({
  numFaces,
  isUnfolded,
  showMonthly,
  highlightedNetwork,
}: SubdividingBlockProps) => {
  const [isDivided, setIsDivided] = useState(true);
  const toggleDivide = () => setIsDivided((prev) => !prev);

  const [hoveredBar, setHoveredBar] = useState<{
    network: string;
    value: number;
    month?: number;
  } | null>(null);

  const socialData = [...(socialDataMap[numFaces] || [])].sort((a, b) => b.posts - a.posts);
  const maxPosts = socialData.reduce((max, d) => (d.posts > max ? d.posts : max), 0);

  
  let parentGeometry: THREE.BufferGeometry;
  switch (numFaces) {
    case 4:
      parentGeometry = new THREE.TetrahedronGeometry(1);
      break;
    case 6:
      parentGeometry = new THREE.BoxGeometry(1, 1, 1);
      break;
    case 8:
      parentGeometry = new THREE.OctahedronGeometry(1);
      break;
    case 12:
      parentGeometry = new THREE.DodecahedronGeometry(1);
      break;
    case 20:
      parentGeometry = new THREE.IcosahedronGeometry(1);
      break;
    default:
      parentGeometry = new THREE.OctahedronGeometry(1);
  }
  parentGeometry.computeVertexNormals();

  
  const faceLayout3D = get3DLayout(numFaces, parentGeometry);
  const twoDLayout = get2DLayout(socialData.length);
  const { positionY } = useSpring({
    positionY: isUnfolded ? -2 : 0, // Passe de 0 à -2 sur l'axe Y
    config: config.gentle,
  });
  
  const springs = useSpring({
    offset: isDivided ? 0.5 : 0,
    scale: isDivided ? 1 : 0,
    config: config.wobbly,
  });

  
  const { fraction } = useSpring({
    fraction: isUnfolded ? 1 : 0,
    config: config.gentle,
  });


  const highlightIndex = socialData.findIndex(
    (d) => d.network === highlightedNetwork
  );


  let targetRotation: [number, number, number] = [0, 0, 0];
  if (!isUnfolded && highlightIndex !== -1 && faceLayout3D[highlightIndex]) {

    const faceNormal = faceLayout3D[highlightIndex].normal.clone().normalize();
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(faceNormal, new THREE.Vector3(0, 1, 0));
    const targetEuler = new THREE.Euler().setFromQuaternion(targetQuat);
    targetRotation = [targetEuler.x, targetEuler.y, targetEuler.z];
   
  }

  const { parentRotation } = useSpring<any>({
    parentRotation: targetRotation,
    config: config.gentle,
  });
  const rowSpacing = 1.2;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <animated.group rotation={parentRotation}>
      <animated.mesh
        geometry={parentGeometry}
        position-y={positionY}
        onClick={toggleDivide}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial color="rgba(59, 213, 227, 0.8)" 
          transparent
          opacity={0.7}
          transmission={1.8} 
          roughness={2} 
          metalness={0.6} 
          ior={1.5} 
          reflectivity={4} 
          thickness={1} 
          envMapIntensity={10} 
        />
      </animated.mesh>
      {showMonthly ? (
        
        Array.from({ length: 12 }).map((_, month) => {
          return (
            <animated.group key={`month-${month}`} position={[0, 0, -rowSpacing * month]}>
              {socialData.map((data, i) => {
                if (!faceLayout3D[i] || !twoDLayout[i]) return null;

                // Récupération de la valeur du mois et calcul de l'échelle
                const postsValue = data.monthlyPosts[month];
                const maxMonthly = socialData.reduce(
                  (max, d) => (d.monthlyPosts[month] > max ? d.monthlyPosts[month] : max),
                  0
                );
                const postsScale = postsValue / (maxMonthly || 1);
                const barHeight = 0.5 + postsScale;

                const c3 = faceLayout3D[i].center;
                const n3 = faceLayout3D[i].normal;
                const adjustedPosition = c3.clone().add(n3.clone().multiplyScalar(barHeight / 2));
                const q3D = new THREE.Quaternion().setFromUnitVectors(
                  new THREE.Vector3(0, 0, 1),
                  n3.clone().normalize()
                );
                const e3D = new THREE.Euler().setFromQuaternion(q3D);
                const c2 = twoDLayout[i].center;
                const e2D = twoDLayout[i].rotation;

                const animatedPosition = fraction.to((f) => {
                  const x = adjustedPosition.x + (c2.x - adjustedPosition.x) * f;
                  let y = adjustedPosition.y * (1 - f) + f * ((0.5 + postsScale) / 2);
                  if (isUnfolded && data.network === highlightedNetwork) {
                    y += 0.5;
                  }
                  const z = adjustedPosition.z + (c2.z - adjustedPosition.z) * f;
                  return [x, y, z];
                });
                const q3 = new THREE.Quaternion().setFromEuler(e3D);
                const q2 = new THREE.Quaternion().setFromEuler(e2D);
                const animatedRotation = fraction.to((f) => {
                  const qm = q3.clone().slerp(q2, f);
                  const e = new THREE.Euler().setFromQuaternion(qm);
                  return [e.x, e.y, e.z];
                });
                const animatedScale = springs.scale.to((s) => {
                  if (highlightedNetwork && !isUnfolded) {
                    return highlightedNetwork === data.network ? [s, s, s] : [0, 0, 0];
                  }
                  return [s, s, s];
                });

                return (
                  <animated.group
                    key={`${month}-${i}`}
                    position={animatedPosition as any}
                    rotation={animatedRotation as any}
                    scale={animatedScale as any}
                    onPointerOver={(e) => {
                      e.stopPropagation();
                      setHoveredBar({
                        network: data.network,
                        month,
                        value: postsValue,
                      });
                    }}
                    onPointerOut={(e) => {
                      e.stopPropagation();
                      setHoveredBar(null);
                    }}

                  >
                    <RoundedBox
                      args={[0.5, 0.5, 0.5 + postsScale]}
                      radius={0.05}
                      smoothness={2}
                    >
                      <meshPhysicalMaterial
                        color={data.color}
                        roughness={0.3}
                        metalness={0.5}
                        transparent
                        opacity={1}
                        transmission={0.5}
                        ior={1.5}
                        thickness={0.2}
                        reflectivity={0.5}
                      />
                    </RoundedBox>



                    {highlightedNetwork && data.network === highlightedNetwork ? (
                      <Billboard
                        position={[0, 0, barHeight / 2 + 0.3]}
                        rotation={[Math.PI / 2, 0, 0]}
                      >
                        


                        <Text fontSize={0.15} color="white" anchorX="center" anchorY="middle">
                          {/* avg posts by day:  */}
                          {data.monthlyPosts[month]}M
                        </Text>
                        <Text fontSize={0.15} color="white" anchorX="center" anchorY="top" position={[0, -0.1, 0]}>
                          {month === 0 && data.network}
                        </Text>
                      </Billboard>
                    ) : (
                      // Afficher uniquement sur le premier mois pour les réseaux non surlignés
                      month === 0 && (
                        <Billboard
                          position={[0, 0, barHeight / 2 + 0.3]}
                          rotation={[Math.PI / 2, 0, 0]}
                        >
                          <Text fontSize={0.15} color="white" anchorX="center" anchorY="top" position={[0, -0.1, 0]}>
                            {data.network}
                          </Text>
                        </Billboard>
                      )
                    )}
{hoveredBar?.network === data.network && hoveredBar.month === month && (
                      <Billboard
                        position={[0, 0, barHeight / 2 + 0.5]}
                        rotation={[Math.PI / 2, 0, 0]}
                      >
                        <Text fontSize={0.15} color="#fff" anchorX="center" anchorY="middle">
                          {hoveredBar.network}/{monthNames[month]}: {hoveredBar.value}M
                        </Text>
                      </Billboard>
                    )}
                  </animated.group>
                );
              })}

              {!isDivided || showMonthly && <Billboard
                position={[
                  twoDLayout[twoDLayout.length - 1]?.center.x + 0.4,
                  twoDLayout[twoDLayout.length - 1]?.center.y + 0.2,
                  twoDLayout[twoDLayout.length - 1]?.center.z,
                ]}
                rotation={[0, 0, 0]}
              >
                <Text fontSize={0.2} color="white" anchorX="left" anchorY="middle">
                  {monthNames[month]}
                </Text>
              </Billboard>}

            </animated.group>
          );
        })
      ) : (

        socialData.map((data, i) => {
          if (!faceLayout3D[i] || !twoDLayout[i]) return null;
          const postsScale = data.posts / maxPosts;
          const barHeight = 0.5 + postsScale;


          const c3 = faceLayout3D[i].center;
          const n3 = faceLayout3D[i].normal;

          const adjustedPosition = c3.clone().add(n3.clone().multiplyScalar(barHeight / 2));


          const q3D = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            n3.clone().normalize()
          );
          const e3D = new THREE.Euler().setFromQuaternion(q3D);


          const c2 = twoDLayout[i].center;
          const e2D = twoDLayout[i].rotation;


          const animatedPosition = fraction.to((f) => {
            const x = adjustedPosition.x + (c2.x - adjustedPosition.x) * f;


            let y = adjustedPosition.y * (1 - f) + f * ((0.5 + postsScale) / 2);
            if (isUnfolded && data.network === highlightedNetwork) {
              y += 0.5;
            }

            const z = adjustedPosition.z + (c2.z - adjustedPosition.z) * f;
            return [x, y, z];
          });


          const q3 = new THREE.Quaternion().setFromEuler(e3D);
          const q2 = new THREE.Quaternion().setFromEuler(e2D);
          const animatedRotation = fraction.to((f) => {
            const qm = q3.clone().slerp(q2, f);
            const e = new THREE.Euler().setFromQuaternion(qm);
            return [e.x, e.y, e.z];
          });
          const animatedScale = springs.scale.to((s) => {
            if (highlightedNetwork && !isUnfolded) {

              return highlightedNetwork === data.network ? [s, s, s] : [0, 0, 0];
            }

            return [s, s, s];
          });
          return (
            <animated.group
              key={i}
              position={animatedPosition as any}
              rotation={animatedRotation as any}
              scale={animatedScale as any}//|| 
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredBar({
                  network: data.network,
                  value: data.posts,
                });
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                setHoveredBar(null);
              }}
            >
              <RoundedBox
                args={[0.5, 0.5, 0.5 + postsScale]} // Taille de la barre
                radius={0.05} // Rayon des coins arrondis
                smoothness={2} // Lissage des coins
              >
                <meshPhysicalMaterial
                  color={data.color}
                  roughness={0.3}
                  metalness={0.5}
                  transparent
                  opacity={1}
                  transmission={0.5}
                  ior={1.5}
                  thickness={0.2}
                  reflectivity={0.5}
                />
              </RoundedBox>
              <Billboard position={[0, 0, barHeight / 2 + 0.3]}
                rotation={[Math.PI / 2, 0, 0]}>
                <Text

                  fontSize={0.15}
                  color="white"
                  anchorX="center"
                  anchorY="bottom"
                >

                  {highlightedNetwork === data.network ? (
                    <>
                      <Text fontSize={0.15} color="white" anchorX="center" anchorY="middle">
                        avg posts by day: {data.posts}M
                      </Text>
                      <Text fontSize={0.15} color="white" anchorX="center" anchorY="top" position={[0, -0.1, 0]}>
                        {data.network}
                      </Text>
                    </>
                  ) : (
                    <Text fontSize={0.15} color="white" anchorX="center" anchorY="bottom" position={[0, -0.20, 0]}>
                      {data.network}
                    </Text>
                  )}
                </Text>
              </Billboard>
              {hoveredBar?.network === data.network && hoveredBar.month === undefined && (
                <Billboard position={[0, 0, barHeight / 2 + 0.6]} rotation={[Math.PI / 2, 0, 0]}>
                  <Text fontSize={0.15} color="#FFF" anchorX="center" anchorY="middle">
                    {hoveredBar.value}M 
                  </Text>
                </Billboard>
              )}
            </animated.group>
          );
        })
      )}
    </animated.group>
  );
};

const BarGraphSection = () => {
  const shapeOptions = [4, 6, 8, 12, 20];

  const [numFaces, setNumFaces] = useState(8);
  const [isUnfolded, setIsUnfolded] = useState(true);
  const [highlightedNetwork, setHighlightedNetwork] = useState<string | null>(null);

  const currentTopNetworks = socialDataMap[numFaces] || [];
  const handleTopSelection = (faces: number) => {
    setNumFaces(faces);
    setHighlightedNetwork(null);
  };
  useEffect(() => {
    if (!isUnfolded) {
      setShowMonthly(false);
    }
  }, [isUnfolded]);

  const handleNetworkHighlight = (network: string) => {
    setHighlightedNetwork((prev) => (prev === network ? null : network));
  };
  const [showTopList, setShowTopList] = useState(false);
  const [showNetworkList, setShowNetworkList] = useState(true);
  const [showMonthly, setShowMonthly] = useState(false);
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Bouton de bascule pour le mode mensuel (visible uniquement si isUnfolded) */}
      {isUnfolded && (
        <div className="absolute top-[10%] right-0  z-10">
          <button
            onClick={() => setShowMonthly((prev) => !prev)}
            className="p-2 bg-gray-800 text-white rounded shadow hover:bg-gray-700 focus:outline-none"
            aria-label="Toggle Monthly View"
          >
            {showMonthly ? 'Year view' : 'Monthly view'}
          </button>
        </div>
      )}

      <AnimatePresence>

        <div className="absolute bottom-0 right-0 z-10">
        <div className="tooltip">
      <motion.button
        key="toggle-unfold"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ duration: 0.3 }}
        onClick={() => setIsUnfolded((prev) => !prev)}
        className="p-3 bg-gray-800 text-white rounded shadow hover:bg-gray-700 focus:outline-none"
        aria-label="Toggle Unfold"
      >
        <FiAlertCircle size={24} />
      </motion.button>
      <span className="tooltiptext">Weird mode!</span>
    </div>
        </div>
      </AnimatePresence>

      <AnimatePresence>

        {!showTopList ? (
          <div className="absolute top-1/2 left-0 transform -translate-y-1/2 z-10">
            <motion.button
              key="open-top-list"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setShowTopList(true)}
              className="p-3 bg-gray-800 text-white rounded shadow hover:bg-gray-700 focus:outline-none"
              aria-label="Open Top List"
            >
              <FiList size={24} />
            </motion.button>
          </div>
        ) : (
          <div className="absolute top-1/2 left-0 transform -translate-y-1/2 z-10">
            <motion.div
              key="top-list-panel"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="p-4 bg-white bg-opacity-75 rounded shadow text-black"
            >
              <button
                onClick={() => setShowTopList(false)}
                className="absolute top-0 right-0 p-1 bg-gray-800 text-white rounded-full hover:bg-gray-700 focus:outline-none"
                aria-label="Close Top List"
              >
                <FiX size={16} />
              </button>
              <h2 className="text-lg font-bold mb-4">Select Top</h2>
              <div className="flex flex-col gap-2">
                {shapeOptions.map((faces) => (
                  <button
                    key={faces}
                    onClick={() => handleTopSelection(faces)}
                    className={`px-4 py-2 rounded shadow text-white ${numFaces === faces ? 'bg-blue-700' : 'bg-gray-400 hover:bg-gray-500'
                      }`}
                  >
                    Top {faces}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {isUnfolded &&  <h2 className="absolute top-1 left-1  z-10  text-white ">{showMonthly ? "Monthly average posts per day" : "Yearly average posts per day"}</h2> }
      <AnimatePresence>

        {!showNetworkList ? (
          <div className="absolute top-1/2 right-0 transform -translate-y-1/2 z-10">
            <motion.button
              key="open-network-list"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setShowNetworkList(true)}
              className="p-3 bg-gray-800 text-white rounded shadow hover:bg-gray-700 focus:outline-none"
              aria-label="Open Network List"
            >
              <FiList size={24} />
            </motion.button>
          </div>
        ) : (
          <div className="absolute top-1/2 right-0 transform -translate-y-1/2 max-h-[60%] overflow-y-auto overflow-x-hidden z-10">
            <motion.div
              key="network-list-panel"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
              className="p-4 bg-white bg-opacity-75 rounded shadow text-black h-full overflow-y-auto"
            >
              <button
                onClick={() => setShowNetworkList(false)}
                className="absolute top-0 right-0 p-1 bg-gray-800 text-white rounded-full hover:bg-gray-700 focus:outline-none"
                aria-label="Close Network List"
              >
                <FiX size={16} />
              </button>
              <h2 className="text-lg font-bold mb-4 sticky top-0 left-0">Networks</h2>
              <div className="flex flex-col gap-2">
                {currentTopNetworks.map((item) => (
                  <button
                    key={item.network}
                    onClick={() => handleNetworkHighlight(item.network)}
                    className={`px-3 py-2 rounded shadow ${highlightedNetwork === item.network
                        ? 'bg-blue-700 text-white'
                        : 'bg-gray-300 hover:bg-gray-400 text-black'
                      }`}
                  >
                    {item.network}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Canvas
        shadows
        camera={{ position: [3, 3, 5], fov: 50 }}
        style={{ background: 'linear-gradient(to bottom, #000428, #004e92)' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.4} />
        <pointLight position={[-5, -5, 5]} intensity={0.5} />
        <Environment preset="night" />

        <SubdividingBlock
          numFaces={numFaces}
          isUnfolded={isUnfolded}
          toggleUnfold={() => setIsUnfolded((prev) => !prev)}
          highlightedNetwork={highlightedNetwork}
          showMonthly={showMonthly}
        />

        <OrbitControls />
      </Canvas>
    </div>
  );
};

export default BarGraphSection;



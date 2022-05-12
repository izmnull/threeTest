/* global Ammo */
/* eslint new-cap: 0 */

import * as THREE from 'three';
import Stats from 'Stats';
// import GUI from 'GUI';
import {OrbitControls} from 'OrbitControls';
import {TransformControls} from 'TransformControls';
import {XHRLoader, PointLight, SpotLight} from 'three';

class APP {
    constructor() {
        this.clock = new THREE.Clock();
        this.physicsWorld = null;
        this.transformAux = null;
        this.dynamicObjects = [];
        this.stats = (function () {
            const stats = new Stats();

            document.body.appendChild(stats.domElement);

            return stats;
        }());
        this.addHelpers = function () {
            this.scene.add(new THREE.GridHelper(100, 10));
            this.scene.add(new THREE.AxesHelper(100));
        };
        this.addControls = function () {
            this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
            this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
            this.orbitControls.update();

            this.scene.add(this.transformControls);
        };
        this.addLights = function () {
            this.scene.add(new THREE.AmbientLight(0x111111));

            const lights = [
                new PointLight(0xffffff, 0.47, 0),
                new PointLight(0xffffff, 0.47, 0),
                new PointLight(0xffffff, 0.47, 0)
            ];

            lights[0].position.set(0, 200, 0);
            lights[1].position.set(100, 200, 100);
            lights[2].position.set(0, 0, 500);

            // lights[0].castShadow = true;
            // lights[0].shadow.mapSize.width = 2048;
            // lights[0].shadow.mapSize.height = 2048;
            lights.forEach((light) => {
                this.scene.add(light);
            });

            const spotLight = new THREE.SpotLight(0xffffff, 0.2, 0, Math.PI/5, 20);

            spotLight.position.set(0, 20, 200);
            this.scene.add(spotLight);
            this.transformControls.attach(spotLight);
        };
        this.addEvent = function () {
            window.addEventListener('resize', () => {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();

                this.renderer.setSize(window.innerWidth, window.innerHeight);
            });

            this.transformControls.addEventListener('dragging-changed', (event) => {
                this.orbitControls.enabled = !event.value;
            });

            // window.addEventListener('keydown', (event) => {
            //     switch (event.key) {
            //         case 'g':
            //             this.transformControls.setMode('translate');
            //             break
            //         case 'r':
            //             this.transformControls.setMode('rotate');
            //             break
            //         case 's':
            //             this.transformControls.setMode('scale');
            //             break;
            //     }
            // });
        };
        this.setupThree = function () {
            this.scene = new THREE.Scene();
            this.renderer = new THREE.WebGLRenderer();
            this.camera = new THREE.PerspectiveCamera(
                100,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );

            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;

            document.body.appendChild(this.renderer.domElement);

            this.camera.position.set(-10, 25, 25);
            this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        };
        this.setupPhysics = function () {
            const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
            const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
            const broadphase = new Ammo.btDbvtBroadphase();
            const solver = new Ammo.btSequentialImpulseConstraintSolver();

            this.physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
            this.transformAux = new Ammo.btTransform();

            this.physicsWorld.setGravity(new Ammo.btVector3(0, -100, 0));
        };
        this.updatePhysics = function (deltaTime) {
            this.physicsWorld.stepSimulation(1 / 60, 1);

            for (let i = 0, il = this.dynamicObjects.length; i < il; i++) {
                const objThree = this.dynamicObjects[i];
                const objPhyBody = objThree.userData.physicsBody;

                if (objPhyBody) {
                    const ms = objPhyBody.getMotionState();

                    if (ms) {
                        ms.getWorldTransform(this.transformAux);

                        const p = this.transformAux.getOrigin();
                        const q = this.transformAux.getRotation();

                        if (objThree.userData.physicsUpdate) {
                            objThree.userData.physicsUpdate(objPhyBody, p, q, objThree, i);
                        }

                        objThree.position.set(p.x(), p.y(), p.z());
                        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
                    }
                }
            }
        };
        this.render = function () {
            requestAnimationFrame(this.render.bind(this));

            this.updatePhysics();
            this.renderer.render(this.scene, this.camera);
            this.stats.update();
        };
        this.initialize = function () {
            this.setupThree();
            this.setupPhysics();
            this.addHelpers();
            this.addControls();
            this.addLights();
            this.addEvent();

            for (const key in this.appendObject) {
                if (Object.hasOwnProperty.call(this.appendObject, key)) {
                    this.generateObject(this.appendObject[key]());
                }
            }

            window.addEventListener('click', () => {
                this.generateObject(this.appendObject.balls());
            });

            this.render();
            // this.test();
        };
        this.test = function () {
            this.generateObject(this.appendObject.balls());

            let geometry = new THREE.CylinderGeometry(20, 20, 10, 32, 32, true);
            // console.log(geometry.hole);
            let mesh = new THREE.Mesh(
                geometry,
                new THREE.MeshStandardMaterial({
                    color: 0xff66bb,
                    roughness: 0.5,
                    side: THREE.DoubleSide
                })
            );

            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.position.set(0, 0, 0);
            this.scene.add(mesh);

            const shape = new Ammo.btConvexHullShape();
            let triangle, triangleMesh = new Ammo.btTriangleMesh;
            let vectA = new Ammo.btVector3(0, 0, 0);
            let vectB = new Ammo.btVector3(0, 0, 0);
            let vectC = new Ammo.btVector3(0, 0, 0);
            let verticesPos = geometry.getAttribute('position').array;
            let triangles = [];

            for (let i = 0; i < verticesPos.length; i += 3) {
                triangles.push({
                    x: verticesPos[i],
                    y: verticesPos[i + 1],
                    z: verticesPos[i + 2]
                });
            }

            // use triangles data to draw ammo shape
            for (let i = 0; i < triangles.length - 3; i += 3) {
                vectA.setX(triangles[i].x);
                vectA.setY(triangles[i].y);
                vectA.setZ(triangles[i].z);
                shape.addPoint(vectA, true);

                vectB.setX(triangles[i + 1].x);
                vectB.setY(triangles[i + 1].y);
                vectB.setZ(triangles[i + 1].z);
                shape.addPoint(vectB, true);

                vectC.setX(triangles[i + 2].x);
                vectC.setY(triangles[i + 2].y);
                vectC.setZ(triangles[i + 2].z);
                shape.addPoint(vectC, true);

                triangleMesh.addTriangle(vectA, vectB, vectC, true);
            }

            const transform = new Ammo.btTransform();

            shape.calculateLocalInertia(0, new Ammo.btVector3(0, 0, 0));
            // arg.collisionShape.setMargin(arg.margin);
            // arg.threeObject.position.set(arg.pos.x(), arg.pos.y(), arg.pos.z());
            // arg.threeObject.receiveShadow = true;
            // arg.threeObject.castShadow = true;
            transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(0, 0, 0));
            const motionState = new Ammo.btDefaultMotionState(transform);
            const rbInfo = new Ammo.btRigidBodyConstructionInfo(
                0,
                motionState,
                shape,
                new Ammo.btVector3(0, 0, 0) // 慣性モーメント
            );
            const objectBody = new Ammo.btRigidBody(rbInfo);

            mesh.userData.physicsBody = objectBody;
            this.dynamicObjects.push(mesh);
            this.physicsWorld.addRigidBody(objectBody);

            // let geometry2 = new THREE.BoxGeometry(10, 5, 10);
            // let mesh2 = new THREE.Mesh(
            //     geometry2,
            //     new THREE.MeshStandardMaterial({
            //         color: 0xff66bb,
            //         roughness: 0.5
            //     })
            // );
            // mesh2.receiveShadow = true;
            // mesh2.castShadow = true;
            // mesh2.position.set(0, 20, 0);
            // this.scene.add(mesh2);
        };
        this.generateObject = function (arg) {
            if (typeof arg === 'undefined') {
                console.error('arg is missing.');

                return;
            }

            const transform = new Ammo.btTransform();

            arg.collisionShape.calculateLocalInertia(arg.mass, arg.localInertia);
            arg.collisionShape.setMargin(arg.margin);
            arg.threeObject.position.set(arg.pos.x(), arg.pos.y(), arg.pos.z());
            arg.threeObject.receiveShadow = true;
            arg.threeObject.castShadow = true;

            transform.setIdentity();
            transform.setOrigin(arg.pos);

            if (arg.rot) {
                const q = new THREE.Quaternion();

                q.setFromEuler(
                    new THREE.Euler(
                        THREE.Math.degToRad(arg.rot.x),
                        THREE.Math.degToRad(arg.rot.y),
                        THREE.Math.degToRad(arg.rot.z)
                    ), 0
                );
                transform.setRotation(new Ammo.btQuaternion(q.x, q.y, q.z, q.w));
                arg.threeObject.quaternion.set(q.x, q.y, q.z, q.w);
            }

            const motionState = new Ammo.btDefaultMotionState(transform);
            const rbInfo = new Ammo.btRigidBodyConstructionInfo(
                arg.mass,
                motionState,
                arg.collisionShape,
                arg.localInertia // 慣性モーメント
            );
            const objectBody = new Ammo.btRigidBody(rbInfo);

            arg.afterPhy(objectBody);

            arg.threeObject.userData.physicsUpdate = arg.updatePhy;
            arg.threeObject.userData.physicsBody = objectBody;

            this.scene.add(arg.threeObject);

            this.dynamicObjects.push(arg.threeObject);
            this.physicsWorld.addRigidBody(objectBody);

            return {arg, objectBody};
        };
        this.texture = (function () {
            return {
                medalFace: new THREE.TextureLoader().load('textures/face.jpg'),
                medalSide: new THREE.TextureLoader().load('textures/side.jpg'),
                medalFaceBump: new THREE.TextureLoader().load('textures/face_bump.jpg'),
                medalSideBump: new THREE.TextureLoader().load('textures/side_bump.jpg')
            };
        }());
        this.phongMaterial = function () {
            return new THREE.MeshPhongMaterial({
                color: 0x666666,
                emissive: 0x333333,
                specular: 0x999999,
                shininess: 10
            });
        };
        this.appendObject = {
            ground: function () {
                let size = new Ammo.btVector3(15, 5, 3);

                return {
                    mass: 0,
                    margin: 0,
                    pos: new Ammo.btVector3(20, 0, 0),
                    rot: {x: 0, y: 0, z: 40},
                    threeObject: (function () {
                        return new THREE.Mesh(
                            new THREE.BoxGeometry(
                                size.x() * 2,
                                size.y() * 2,
                                size.z() * 2
                            ),
                            new THREE.MeshPhongMaterial({
                                color: 0x66bbff,
                                specular: 0x222222
                            })
                        );
                    }()),
                    collisionShape: new Ammo.btBoxShape(size),
                    localInertia: new Ammo.btVector3(0, 0, 0),
                    afterPhy: (body) => {
                        body.setRestitution(1); // 反発係数
                        body.setFriction(0);    // 摩擦係数
                        body.setAngularFactor(new Ammo.btVector3(0, 0, 0)); // 回転制限
                        body.setLinearFactor(new Ammo.btVector3(0, 0, 0)); // 滑り制限
                    },
                    updatePhy: function (body) {
                        // body.setAngularVelocity(new Ammo.btVector3(0, +2, 0));
                    }
                };
            },
            ground2: function () {
                let size = new Ammo.btVector3(15, 5, 3);

                return {
                    mass: 0,
                    margin: 0,
                    pos: new Ammo.btVector3(-20, 0, 0),
                    rot: { x: 0, y: 0, z: -40 },
                    threeObject: (function () {
                        return new THREE.Mesh(
                            new THREE.BoxGeometry(
                                size.x() * 2,
                                size.y() * 2,
                                size.z() * 2
                            ),
                            new THREE.MeshPhongMaterial({
                                color: 0x66bbff,
                                specular: 0x222222
                            })
                        );
                    }()),
                    collisionShape: new Ammo.btBoxShape(size),
                    localInertia: new Ammo.btVector3(0, 0, 0),
                    afterPhy: (body) => {
                        body.setRestitution(1); // 反発係数
                        body.setFriction(0);    // 摩擦係数
                        body.setAngularFactor(new Ammo.btVector3(0, 0, 0)); // 回転制限
                        body.setLinearFactor(new Ammo.btVector3(0, 0, 0)); // 滑り制限
                    },
                    updatePhy: function (body) {
                        // body.setAngularVelocity(new Ammo.btVector3(0, +2, 0));
                    }
                };
            },
            upperGround: function () {
                return;
                let size = new Ammo.btVector3(20, 3, 12.5);
                let flag = true;

                return {
                    mass: 10,
                    margin: 0,
                    pos: new Ammo.btVector3(0, 3, -12.5),
                    // rot: {x: 0, y: 45, z: 0},
                    threeObject: (() => {
                        return new THREE.Mesh(
                            new THREE.BoxGeometry(
                                size.x() * 2,
                                size.y() * 2,
                                size.z() * 2
                            ),
                            new THREE.MeshPhongMaterial({
                                color: 0x464759,
                                emissive: 0x333336,
                                specular: 0xcccccc,
                                shininess: 10,
                                map: this.texture.medalSide
                            })
                        );
                    })(),
                    collisionShape: new Ammo.btBoxShape(size),
                    localInertia: new Ammo.btVector3(0, 0, 0),
                    afterPhy: (body) => {
                        body.setRestitution(5); // 反発係数
                        body.setFriction(10); // 摩擦係数
                        body.setAngularFactor(new Ammo.btVector3(0, 0, 0)); // 回転制限
                        body.setLinearFactor(new Ammo.btVector3(0, 0, 0)); // 滑り制限
                    },
                    updatePhy: function (body, p, q, objThree, i) {
                        let val = -5;

                        if (flag) {
                            val = 5;

                            if (p.z() >= -10.5) {
                                flag = false;
                                val = -5;
                            }
                        } else {
                            if (p.z() <= -20) {
                                flag = true;
                            }
                        }

                        body.setLinearVelocity(new Ammo.btVector3(0, 0, +val));
                    }.bind(this)
                };
            }.bind(this),
            wallLeft: function () {
                return;
                let size = new Ammo.btVector3(0.5, 6, 22.5);

                return {
                    mass: 0,
                    margin: 0,
                    pos: new Ammo.btVector3(-19.5, 6, 2.5),
                    // rot: {x: 0, y: 45, z: 0},
                    threeObject: (function () {
                        return new THREE.Mesh(
                            new THREE.BoxGeometry(
                                size.x() * 2,
                                size.y() * 2,
                                size.z() * 2
                            ),
                            new THREE.MeshPhongMaterial({
                                color: 0x464749,
                                emissive: 0x000000,
                                specular: 0x555555,
                                shininess: 150
                            })
                        );
                    }()),
                    collisionShape: new Ammo.btBoxShape(size),
                    localInertia: new Ammo.btVector3(0, 0, 0),
                    afterPhy: (body) => {
                        body.setRestitution(1); // 反発係数
                        body.setFriction(500); // 摩擦係数
                        body.setAngularFactor(new Ammo.btVector3(0, 0, 0)); // 回転制限
                        body.setLinearFactor(new Ammo.btVector3(0, 0, 0)); // 滑り制限
                    }
                };
            },
            wallRight: function () {
                return;
                let size = new Ammo.btVector3(0.5, 6, 22.5);

                return {
                    mass: 0,
                    margin: 0,
                    pos: new Ammo.btVector3(19.5, 6, 2.5),
                    // rot: {x: 0, y: 45, z: 0},
                    threeObject: (function () {
                        return new THREE.Mesh(
                            new THREE.BoxGeometry(
                                size.x() * 2,
                                size.y() * 2,
                                size.z() * 2
                            ),
                            new THREE.MeshPhongMaterial({
                                color: 0x464749,
                                emissive: 0x000000,
                                specular: 0x555555,
                                shininess: 150
                            })
                        );
                    }()),
                    collisionShape: new Ammo.btBoxShape(size),
                    localInertia: new Ammo.btVector3(0, 0, 0),
                    afterPhy: (body) => {
                        body.setRestitution(1); // 反発係数
                        body.setFriction(500); // 摩擦係数
                        body.setAngularFactor(new Ammo.btVector3(0, 0, 0)); // 回転制限
                        body.setLinearFactor(new Ammo.btVector3(0, 0, 0)); // 滑り制限
                    }
                };
            },
            wallBack: function () {
                return;
                let size = new Ammo.btVector3(20, 6, 0.5);

                return {
                    mass: 0,
                    margin: 0,
                    pos: new Ammo.btVector3(0, 6, -20.5),
                    // rot: {x: 0, y: 45, z: 0},
                    threeObject: (function () {
                        return new THREE.Mesh(
                            new THREE.BoxGeometry(
                                size.x() * 2,
                                size.y() * 2,
                                size.z() * 2
                            ),
                            new THREE.MeshPhongMaterial({
                                color: 0x464749,
                                emissive: 0x000000,
                                specular: 0x555555,
                                shininess: 150
                            })
                        );
                    }()),
                    collisionShape: new Ammo.btBoxShape(size),
                    localInertia: new Ammo.btVector3(0, 0, 0),
                    afterPhy: (body) => {
                        body.setRestitution(1); // 反発係数
                        body.setFriction(500); // 摩擦係数
                        body.setAngularFactor(new Ammo.btVector3(0, 0, 0)); // 回転制限
                        body.setLinearFactor(new Ammo.btVector3(0, 0, 0)); // 滑り制限
                    }
                };
            },
            medals: function () {
                return;
                let radius = 3;
                let height = 0.8;
                let size = new Ammo.btVector3(radius, height / 2, radius);
                let face = this.phongMaterial();
                let side = this.phongMaterial();

                side.map = this.texture.medalSide;
                side.bumpMap = this.texture.medalSideBump;
                face.bumpMap = this.texture.medalFaceBump;

                return {
                    mass: 100,
                    margin: 0.1,
                    pos: new Ammo.btVector3(0, 25, -15),
                    threeObject: (() => {
                        return new THREE.Mesh(
                            new THREE.CylinderGeometry(
                                radius,
                                radius,
                                height,
                                24
                            ),
                            [
                                side,
                                face,
                                face
                            ]
                        );
                    })(),
                    collisionShape: new Ammo.btCylinderShape(size),
                    localInertia: new Ammo.btVector3(0, 0, 0),
                    afterPhy: function (body) {
                        // 加速度
                        body.setLinearVelocity(new Ammo.btVector3(
                            Math.floor(Math.random() * (21 - -20)) + -20, -10, 0)
                        );
                        body.setRestitution(0.05); // 反発係数
                        // body.setFriction(50);         // 摩擦係数
                        body.setFriction(0.2);         // 摩擦係数
                        body.setDamping(0, 0.1);      // 減衰率
                        body.setAngularFactor(new Ammo.btVector3(1, 1, 1)); // 回転制限
                        body.setLinearFactor(new Ammo.btVector3(1, 1, 1));  // 滑り制限
                    },
                    updatePhy: function (body, p, q, objThree, i) {
                        if (p.y() <= -10) {
                            this.physicsWorld.removeRigidBody(body);
                            this.dynamicObjects[i] = {
                                userData: false
                            };
                            this.scene.remove(objThree);
                            objThree.material[0].dispose();
                            objThree.material[1].dispose();
                            objThree.material[2].dispose();
                            objThree.geometry.dispose();
                        }
                    }.bind(this)
                };
            }.bind(this),
            balls: function () {
                let size = 3;

                return {
                    mass: size * 5,
                    margin: 0.5,
                    pos: new Ammo.btVector3(0, 40, 0),
                    threeObject: function () {
                        return new THREE.Mesh(
                            new THREE.SphereGeometry(size, 20, 20),
                            new THREE.MeshPhongMaterial({
                                color: 0x66bbff,
                                specular: 0x222222,
                                wireframe: true,
                                wireframeLinewidth: 0.2
                            })
                        );
                    } (),
                    collisionShape: new Ammo.btSphereShape(size),
                    localInertia: new Ammo.btVector3(0, 0, 0),
                    afterPhy: function (body) {
                        // // Z軸に加速度(1)を追加
                        body.setLinearVelocity(new Ammo.btVector3(20, -10, 0));
                        // // 反発係数を設定
                        body.setRestitution(0.9);
                        // // 摩擦係数を設定
                        body.setFriction(0.1);
                        // // 減衰率を設定
                        body.setDamping(0, 0.01);
                        // // 回転制限（1の軸でしか回転しない）
                        body.setAngularFactor(new Ammo.btVector3(1, 1, 1));
                        // // 滑り制限（1の軸でしか動かない。初期値には適用されない）
                        body.setLinearFactor(new Ammo.btVector3(1, 1, 1));
                    }
                };
            }
        };
    }
}

Ammo().then(function (AmmoLib) {
    window.Ammo = AmmoLib;
    window.app = new APP();
    window.app.initialize();
});

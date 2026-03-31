import { getPresetTemplate } from "openvideo";

export const animationKeys = [
  "slideRotateIn",
  "slideRotateOut",
  "slideBlurIn",
  "slideBlurOut",
  "zoomRotateIn",
  "zoomRotateOut",
  "zoomBlurIn",
  "zoomBlurOut",
  "slideZoomIn",
  "slideZoomOut",
  "verticalBlurIn",
  "verticalBlurOut",
  "rotateBlurIn",
  "rotateBlurOut",
  "cinematicSlideZoomBlurIn",
  "cinematicSlideZoomBlurOut",
  "brightnessZoomIn",
  "brightnessZoomOut",
  "brightnessSlideIn",
  "brightnessSlideOut",
  "tiltZoomBlurIn",
  "tiltZoomBlurOut",
  "dropRotateIn",
  "dropRotateOut",
  "spiralIn",
  "spiralOut",
  "flashSlideIn",
  "flashSlideOut",
  "heavyCinematicIn",
  "heavyCinematicOut",
  "diagonalSlideRotateIn",
  "diagonalSlideRotateOut",
  "diagonalBlurZoomIn",
  "diagonalBlurZoomOut",
  "rotateBrightnessIn",
  "rotateBrightnessOut",
  "zoomBrightnessBlurIn",
  "zoomBrightnessBlurOut",
  "slideUpRotateZoomIn",
  "slideUpRotateZoomOut",
  "fallBlurRotateIn",
  "fallBlurRotateOut",
  "sideStretchZoomIn",
  "sideStretchZoomOut",
  "darkSlideBlurIn",
  "darkSlideBlurOut",
  "liftZoomRotateIn",
  "liftZoomRotateOut",
  "overexposedZoomIn",
  "overexposedZoomOut",
  "pushDownZoomBlurIn",
  "pushDownZoomBlurOut",
  "twistSlideBrightnessIn",
  "twistSlideBrightnessOut",
  "collapseRotateZoomIn",
  "collapseRotateZoomOut",
  "ultraCinematicIn",
  "ultraCinematicOut",
  "blurSlideRightIn",
  "wobbleZoomIn",
  "spinZoomIn",
  "blurSlideLeftIn",
  "blurSlideRightStrongIn",
  "cinematicZoomSlideIn",
  "elasticTwistIn",
  "spinFadeIn",
  "flashZoomIn",
  "tiltSlideRightIn",
  "tiltZoomIn",
  "glitchSlideIn",
  "dropBlurIn",
  "fallZoomIn",
  "zoomSpinIn",
  "dramaticSpinSlideIn",
  "tiltSlideRightOut",
  "tiltZoomOut",
  "glitchSlideOut",
  "dropBlurOut",
  "fallZoomOut",
  "zoomSpinOut",
  "dramaticSpinSlideOut",
  "blurSlideRightOut",
  "wobbleZoomOut",
  "spinZoomOut",
  "blurSlideLeftOut",
  "blurSlideRightStrongOut",
  "cinematicZoomSlideOut",
  "elasticTwistOut",
  "spinFadeOut",
  "flashZoomOut",
  //custom
  "sideToSideLeftToRightIn",
  "sideToSideRightToLeftIn",
  "rotateClockwiseIn",
  "rotateCounterClockwiseIn",
  "shakeIn",
  "zoomIn",
  "zoomOut",
  "sideToSideLeftToRightOut",
  "sideToSideRightToLeftOut",
  "rotateClockwiseOut",
  "rotateCounterClockwiseOut",
  "shakeOut",
];

export const customAnimationKeys = [
  "zoomIn",
  "zoomOut",
  "sideToSideLeftToRightIn",
  "sideToSideRightToLeftIn",
  "sideToSideLeftToRightOut",
  "sideToSideRightToLeftOut",
  "rotateClockwiseIn",
  "rotateClockwiseOut",
  "rotateCounterClockwiseIn",
  "rotateCounterClockwiseOut",
  "shakeIn",
  "shakeOut",
];

export const fastAnimationKeys = [
  "blurSlideRightIn",
  "wobbleZoomIn",
  "spinZoomIn",
  "blurSlideLeftIn",
  "blurSlideRightStrongIn",
  "cinematicZoomSlideIn",
  "elasticTwistIn",
  "spinFadeIn",
  "flashZoomIn",
  "tiltSlideRightIn",
  "tiltZoomIn",
  "glitchSlideIn",
  "dropBlurIn",
  "fallZoomIn",
  "zoomSpinIn",
  "dramaticSpinSlideIn",
  "tiltSlideRightOut",
  "tiltZoomOut",
  "glitchSlideOut",
  "dropBlurOut",
  "fallZoomOut",
  "zoomSpinOut",
  "dramaticSpinSlideOut",
  "blurSlideRightOut",
  "wobbleZoomOut",
  "spinZoomOut",
  "blurSlideLeftOut",
  "blurSlideRightStrongOut",
  "cinematicZoomSlideOut",
  "elasticTwistOut",
  "spinFadeOut",
  "flashZoomOut",
  //custom
  // "zoomIn",
  // "zoomOut",
  // "sideToSideLeftToRightIn",
  // "sideToSideRightToLeftIn",
  // "sideToSideLeftToRightOut",
  // "sideToSideRightToLeftOut",
  // "rotateClockwiseIn",
  // "rotateClockwiseOut",
  // "rotateCounterClockwiseIn",
  // "rotateCounterClockwiseOut",
  // "shakeIn",
  // "shakeOut",
];

const baseParams = { mirror: 1 };

const overrides: Record<string, Partial<typeof baseParams & any>> = {
  fadeIn: {
    opacityInit: 0,
    opacityEnd: 1,
  },
  fadeOut: {
    opacityInit: 1,
    opacityEnd: 0,
  },
  zoomIn: {
    scaleInit: 0,
    scaleEnd: 1,
    opacityInit: 0,
    opacityEnd: 1,
  },
  zoomOut: {
    scaleInit: 1,
    scaleEnd: 0,
    opacityInit: 1,
    opacityEnd: 0,
  },

  slideIn: {
    direction: "left",
    distance: 300,
    xPositionEnd: 0,
    yPositionEnd: 0,
    opacityInit: 0,
    opacityEnd: 1,
  },

  slideOut: {
    direction: "left",
    distance: 300,
    xPositionInit: 0,
    yPositionInit: 0,
    opacityInit: 1,
    opacityEnd: 0,
  },

  pulse: {
    scaleInit: 1,
    scaleEnd: 0.9,
  },

  blurIn: {
    blurInit: 20,
    blurEnd: 0,
    opacityInit: 0,
    opacityEnd: 1,
  },

  blurOut: {
    blurInit: 0,
    blurEnd: 20,
    opacityInit: 1,
    opacityEnd: 0,
  },

  blurSlideRightIn: {
    blurInit: 5,
    blurEnd: 0,
    xPositionInit: 300,
    xPositionEnd: 0,
    scaleInit: 0.85,
    scaleEnd: 1,
  },

  wobbleZoomIn: {
    scaleInit: 1.3,
    scaleEnd: 1,
    angleInit: -8,
    angleEnd: 0,
  },

  spinZoomIn: {
    blurInit: 15,
    blurEnd: 0,
    angleInit: 180,
    angleEnd: 0,
    scaleInit: 0.7,
    scaleEnd: 1,
  },

  blurSlideLeftIn: {
    blurInit: 5,
    blurEnd: 0,
    xPositionInit: -400,
    xPositionEnd: 0,
    scaleInit: 0.85,
    scaleEnd: 1,
  },

  blurSlideRightStrongIn: {
    blurInit: 5,
    blurEnd: 0,
    xPositionInit: 600,
    xPositionEnd: 0,
    scaleInit: 0.85,
    scaleEnd: 1,
  },

  cinematicZoomSlideIn: {
    scaleInit: 1.5,
    scaleEnd: 1,
    blurInit: 20,
    blurEnd: 0,
    xPositionInit: 100,
    xPositionEnd: 0,
  },

  elasticTwistIn: {
    scaleInit: 0.7,
    scaleEnd: 1,
    blurInit: 15,
    blurEnd: 0,
    angleInit: 45,
    angleEnd: 0,
  },

  spinFadeIn: {
    blurInit: 5,
    blurEnd: 0,
    angleInit: 20,
    angleEnd: 0,
    scaleInit: 0.85,
    scaleEnd: 1,
  },
  flashZoomIn: {
    scaleInit: 1,
    scaleEnd: 1,
    brightnessInit: 1.5,
    brightnessEnd: 1,
  },

  tiltSlideRightIn: {
    angleInit: -12,
    angleEnd: 0,
    xPositionInit: -400,
    xPositionEnd: 0,
    scaleInit: 1.1,
    scaleEnd: 1,
  },

  tiltZoomIn: {
    angleInit: 15,
    angleEnd: 0,
    scaleInit: 0.7,
    scaleEnd: 1,
  },

  glitchSlideIn: {
    xPositionInit: 600,
    xPositionEnd: 0,
    angleInit: 15,
    angleEnd: 0,
    scaleInit: 0.85,
    scaleEnd: 1,
  },

  dropBlurIn: {
    yPositionInit: -500,
    yPositionEnd: 0,
    blurInit: 30,
    blurEnd: 0,
    scaleInit: 0.9,
    scaleEnd: 1,
  },

  fallZoomIn: {
    yPositionInit: -400,
    yPositionEnd: 0,
    scaleInit: 1.5,
    scaleEnd: 1,
  },

  zoomSpinIn: {
    scaleInit: 3,
    scaleEnd: 1,
    angleInit: -45,
    angleEnd: 0,
    blurInit: 5,
    blurEnd: 0,
  },

  dramaticSpinSlideIn: {
    xPositionInit: 800,
    xPositionEnd: 0,
    angleInit: -20,
    angleEnd: 0,
    blurInit: 5,
    blurEnd: 0,
    scaleInit: 0.85,
    scaleEnd: 1,
  },

  blurSlideRightOut: {
    blurInit: 0,
    blurEnd: 20,
    xPositionInit: 0,
    xPositionEnd: 300,
    scaleInit: 1,
    scaleEnd: 0.85,
  },
  wobbleZoomOut: {
    scaleInit: 1,
    scaleEnd: 1.3,
    angleInit: 0,
    angleEnd: 8,
  },

  spinZoomOut: {
    scaleInit: 1,
    scaleEnd: 0.7,
    angleInit: 0,
    angleEnd: -180,
    blurInit: 0,
    blurEnd: 15,
  },

  blurSlideLeftOut: {
    xPositionInit: 0,
    xPositionEnd: -400,
    scaleInit: 1,
    scaleEnd: 0.85,
    blurInit: 0,
    blurEnd: 5,
  },

  blurSlideRightStrongOut: {
    xPositionInit: 0,
    xPositionEnd: 600,
    scaleInit: 1,
    scaleEnd: 0.85,
    blurInit: 0,
    blurEnd: 5,
  },

  cinematicZoomSlideOut: {
    scaleInit: 1,
    scaleEnd: 1.5,
    xPositionInit: 0,
    xPositionEnd: -100,
    blurInit: 0,
    blurEnd: 20,
  },

  elasticTwistOut: {
    scaleInit: 1,
    scaleEnd: 0.7,
    angleInit: 0,
    angleEnd: -45,
    blurInit: 0,
    blurEnd: 15,
  },

  spinFadeOut: {
    scaleInit: 1,
    scaleEnd: 0.85,
    angleInit: 0,
    angleEnd: -20,
    blurInit: 0,
    blurEnd: 5,
  },

  flashZoomOut: {
    scaleInit: 1,
    scaleEnd: 1,
    brightnessInit: 1,
    brightnessEnd: 1.5,
  },

  tiltSlideRightOut: {
    angleInit: 0,
    angleEnd: 12,
    xPositionInit: 0,
    xPositionEnd: 400,
    scaleInit: 1,
    scaleEnd: 1.1,
  },

  tiltZoomOut: {
    angleInit: 0,
    angleEnd: -15,
    scaleInit: 1,
    scaleEnd: 0.7,
  },

  glitchSlideOut: {
    xPositionInit: 0,
    xPositionEnd: -600,
    angleInit: 0,
    angleEnd: -15,
    scaleInit: 1,
    scaleEnd: 0.85,
  },

  dropBlurOut: {
    yPositionInit: 0,
    yPositionEnd: 500,
    scaleInit: 1,
    scaleEnd: 0.9,
    blurInit: 0,
    blurEnd: 30,
  },

  fallZoomOut: {
    yPositionInit: 0,
    yPositionEnd: 400,
    scaleInit: 1,
    scaleEnd: 1.5,
  },

  zoomSpinOut: {
    scaleInit: 1,
    scaleEnd: 3,
    angleInit: 0,
    angleEnd: 45,
    blurInit: 0,
    blurEnd: 5,
  },

  dramaticSpinSlideOut: {
    xPositionInit: 0,
    xPositionEnd: -800,
    scaleInit: 1,
    scaleEnd: 0.85,
    angleInit: 0,
    angleEnd: 20,
    blurInit: 0,
    blurEnd: 5,
  },
  slideRotateIn: {
    xPositionInit: -200,
    xPositionEnd: 0,
    angleInit: -15,
    angleEnd: 0,
  },

  slideRotateOut: {
    xPositionInit: 0,
    xPositionEnd: -200,
    angleInit: 0,
    angleEnd: -15,
  },

  slideBlurIn: {
    xPositionInit: 250,
    xPositionEnd: 0,
    blurInit: 20,
    blurEnd: 0,
  },

  slideBlurOut: {
    xPositionInit: 0,
    xPositionEnd: 250,
    blurInit: 0,
    blurEnd: 20,
  },

  zoomRotateIn: {
    scaleInit: 1.4,
    scaleEnd: 1,
    angleInit: 20,
    angleEnd: 0,
  },

  zoomRotateOut: {
    scaleInit: 1,
    scaleEnd: 1.4,
    angleInit: 0,
    angleEnd: 20,
  },

  zoomBlurIn: {
    scaleInit: 1.6,
    scaleEnd: 1,
    blurInit: 30,
    blurEnd: 0,
  },

  zoomBlurOut: {
    scaleInit: 1,
    scaleEnd: 1.6,
    blurInit: 0,
    blurEnd: 30,
  },

  slideZoomIn: {
    xPositionInit: -300,
    xPositionEnd: 0,
    scaleInit: 0.7,
    scaleEnd: 1,
  },

  slideZoomOut: {
    xPositionInit: 0,
    xPositionEnd: -300,
    scaleInit: 1,
    scaleEnd: 0.7,
  },

  verticalBlurIn: {
    yPositionInit: 200,
    yPositionEnd: 0,
    blurInit: 25,
    blurEnd: 0,
  },

  verticalBlurOut: {
    yPositionInit: 0,
    yPositionEnd: 200,
    blurInit: 0,
    blurEnd: 25,
  },

  rotateBlurIn: {
    angleInit: 45,
    angleEnd: 0,
    blurInit: 20,
    blurEnd: 0,
  },

  rotateBlurOut: {
    angleInit: 0,
    angleEnd: 45,
    blurInit: 0,
    blurEnd: 20,
  },

  cinematicSlideZoomBlurIn: {
    xPositionInit: 300,
    xPositionEnd: 0,
    scaleInit: 0.7,
    scaleEnd: 1,
    blurInit: 40,
    blurEnd: 0,
  },

  cinematicSlideZoomBlurOut: {
    xPositionInit: 0,
    xPositionEnd: 300,
    scaleInit: 1,
    scaleEnd: 0.7,
    blurInit: 0,
    blurEnd: 40,
  },

  brightnessZoomIn: {
    scaleInit: 1.3,
    scaleEnd: 1,
    brightnessInit: 3,
    brightnessEnd: 1,
  },
  brightnessZoomOut: {
    scaleInit: 1,
    scaleEnd: 1.3,
    brightnessInit: 1,
    brightnessEnd: 3,
  },

  brightnessSlideIn: {
    xPositionInit: -200,
    xPositionEnd: 0,
    brightnessInit: 0.3,
    brightnessEnd: 1,
  },

  brightnessSlideOut: {
    xPositionInit: 0,
    xPositionEnd: -200,
    brightnessInit: 1,
    brightnessEnd: 0.3,
  },

  tiltZoomBlurIn: {
    angleInit: -10,
    angleEnd: 0,
    scaleInit: 1.4,
    scaleEnd: 1,
    blurInit: 20,
    blurEnd: 0,
  },

  tiltZoomBlurOut: {
    angleInit: 0,
    angleEnd: -10,
    scaleInit: 1,
    scaleEnd: 1.4,
    blurInit: 0,
    blurEnd: 20,
  },

  dropRotateIn: {
    yPositionInit: -250,
    yPositionEnd: 0,
    angleInit: 15,
    angleEnd: 0,
  },

  dropRotateOut: {
    yPositionInit: 0,
    yPositionEnd: -250,
    angleInit: 0,
    angleEnd: 15,
  },

  spiralIn: {
    scaleInit: 0.7,
    scaleEnd: 1,
    angleInit: 90,
    angleEnd: 0,
    blurInit: 30,
    blurEnd: 0,
  },

  spiralOut: {
    scaleInit: 1,
    scaleEnd: 0.7,
    angleInit: 0,
    angleEnd: 90,
    blurInit: 0,
    blurEnd: 30,
  },

  flashSlideIn: {
    xPositionInit: 150,
    xPositionEnd: 0,
    brightnessInit: 4,
    brightnessEnd: 1,
  },

  flashSlideOut: {
    xPositionInit: 0,
    xPositionEnd: 150,
    brightnessInit: 1,
    brightnessEnd: 4,
  },

  heavyCinematicIn: {
    xPositionInit: -300,
    xPositionEnd: 0,
    scaleInit: 0.7,
    scaleEnd: 1,
    angleInit: -20,
    angleEnd: 0,
    blurInit: 50,
    blurEnd: 0,
  },

  heavyCinematicOut: {
    xPositionInit: 0,
    xPositionEnd: -300,
    scaleInit: 1,
    scaleEnd: 0.7,
    angleInit: 0,
    angleEnd: -20,
    blurInit: 0,
    blurEnd: 50,
  },

  diagonalSlideRotateIn: {
    xPositionInit: -200,
    xPositionEnd: 0,
    yPositionInit: 150,
    yPositionEnd: 0,
    angleInit: -20,
    angleEnd: 0,
  },

  diagonalSlideRotateOut: {
    xPositionInit: 0,
    xPositionEnd: -200,
    yPositionInit: 0,
    yPositionEnd: 150,
    angleInit: 0,
    angleEnd: -20,
  },
  diagonalBlurZoomIn: {
    xPositionInit: 150,
    xPositionEnd: 0,
    yPositionInit: -150,
    yPositionEnd: 0,
    scaleInit: 0.7,
    scaleEnd: 1,
    blurInit: 30,
    blurEnd: 0,
  },

  diagonalBlurZoomOut: {
    xPositionInit: 0,
    xPositionEnd: 150,
    yPositionInit: 0,
    yPositionEnd: -150,
    scaleInit: 1,
    scaleEnd: 0.7,
    blurInit: 0,
    blurEnd: 30,
  },

  rotateBrightnessIn: {
    angleInit: 60,
    angleEnd: 0,
    brightnessInit: 0.2,
    brightnessEnd: 1,
  },

  rotateBrightnessOut: {
    angleInit: 0,
    angleEnd: 60,
    brightnessInit: 1,
    brightnessEnd: 0.2,
  },

  zoomBrightnessBlurIn: {
    scaleInit: 1.8,
    scaleEnd: 1,
    brightnessInit: 3,
    brightnessEnd: 1,
    blurInit: 25,
    blurEnd: 0,
  },

  zoomBrightnessBlurOut: {
    scaleInit: 1,
    scaleEnd: 1.8,
    brightnessInit: 1,
    brightnessEnd: 3,
    blurInit: 0,
    blurEnd: 25,
  },

  slideUpRotateZoomIn: {
    yPositionInit: 250,
    yPositionEnd: 0,
    angleInit: -15,
    angleEnd: 0,
    scaleInit: 0.7,
    scaleEnd: 1,
  },

  slideUpRotateZoomOut: {
    yPositionInit: 0,
    yPositionEnd: 250,
    angleInit: 0,
    angleEnd: -15,
    scaleInit: 1,
    scaleEnd: 0.7,
  },

  fallBlurRotateIn: {
    yPositionInit: -300,
    yPositionEnd: 0,
    blurInit: 40,
    blurEnd: 0,
    angleInit: 25,
    angleEnd: 0,
  },

  fallBlurRotateOut: {
    yPositionInit: 0,
    yPositionEnd: -300,
    blurInit: 0,
    blurEnd: 40,
    angleInit: 0,
    angleEnd: 25,
  },

  sideStretchZoomIn: {
    xPositionInit: 300,
    xPositionEnd: 0,
    scaleInit: 1.6,
    scaleEnd: 1,
  },

  sideStretchZoomOut: {
    xPositionInit: 0,
    xPositionEnd: 300,
    scaleInit: 1,
    scaleEnd: 1.6,
  },

  darkSlideBlurIn: {
    xPositionInit: -250,
    xPositionEnd: 0,
    blurInit: 35,
    blurEnd: 0,
    brightnessInit: 0.3,
    brightnessEnd: 1,
  },

  darkSlideBlurOut: {
    xPositionInit: 0,
    xPositionEnd: -250,
    blurInit: 0,
    blurEnd: 35,
    brightnessInit: 1,
    brightnessEnd: 0.3,
  },
  liftZoomRotateIn: {
    yPositionInit: 200,
    yPositionEnd: 0,
    scaleInit: 0.7,
    scaleEnd: 1,
    angleInit: 12,
    angleEnd: 0,
  },

  liftZoomRotateOut: {
    yPositionInit: 0,
    yPositionEnd: 200,
    scaleInit: 1,
    scaleEnd: 0.7,
    angleInit: 0,
    angleEnd: 12,
  },

  overexposedZoomIn: {
    scaleInit: 1.4,
    scaleEnd: 1,
    brightnessInit: 4,
    brightnessEnd: 1,
  },

  overexposedZoomOut: {
    scaleInit: 1,
    scaleEnd: 1.4,
    brightnessInit: 1,
    brightnessEnd: 4,
  },

  driftRotateBlurIn: {
    xPositionInit: 120,
    xPositionEnd: 0,
    angleInit: -30,
    angleEnd: 0,
    blurInit: 25,
    blurEnd: 0,
  },

  driftRotateBlurOut: {
    xPositionInit: 0,
    xPositionEnd: 120,
    angleInit: 0,
    angleEnd: -30,
    blurInit: 0,
    blurEnd: 25,
  },

  pushDownZoomBlurIn: {
    yPositionInit: -180,
    yPositionEnd: 0,
    scaleInit: 1.5,
    scaleEnd: 1,
    blurInit: 20,
    blurEnd: 0,
  },

  pushDownZoomBlurOut: {
    yPositionInit: 0,
    yPositionEnd: -180,
    scaleInit: 1,
    scaleEnd: 1.5,
    blurInit: 0,
    blurEnd: 20,
  },

  twistSlideBrightnessIn: {
    xPositionInit: 200,
    xPositionEnd: 0,
    angleInit: 25,
    angleEnd: 0,
    brightnessInit: 0.4,
    brightnessEnd: 1,
  },

  twistSlideBrightnessOut: {
    xPositionInit: 0,
    xPositionEnd: 200,
    angleInit: 0,
    angleEnd: 25,
    brightnessInit: 1,
    brightnessEnd: 0.4,
  },

  collapseRotateZoomIn: {
    scaleInit: 0.7,
    scaleEnd: 1,
    angleInit: -45,
    angleEnd: 0,
  },

  collapseRotateZoomOut: {
    scaleInit: 1,
    scaleEnd: 0.7,
    angleInit: 0,
    angleEnd: -45,
  },

  ultraCinematicIn: {
    xPositionInit: 400,
    xPositionEnd: 0,
    yPositionInit: 200,
    yPositionEnd: 0,
    scaleInit: 0.7,
    scaleEnd: 1,
    blurInit: 60,
    blurEnd: 0,
    angleInit: 30,
    angleEnd: 0,
  },

  ultraCinematicOut: {
    xPositionInit: 0,
    xPositionEnd: 400,
    yPositionInit: 0,
    yPositionEnd: 200,
    scaleInit: 1,
    scaleEnd: 0.7,
    blurInit: 0,
    blurEnd: 60,
    angleInit: 0,
    angleEnd: 30,
  },
};

export const presetParamsMap = Object.fromEntries(
  animationKeys.map((key) => [
    key,
    {
      ...baseParams,
      ...(overrides[key] || {}),
    },
  ]),
);

const formatLabel = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());

export const animationOptionsIn = animationKeys
  .filter((key) => key.endsWith("In"))
  .map((key) => ({
    value: key,
    label: formatLabel(key),
  }));

export const animationOptionsOut = animationKeys
  .filter((key) => key.endsWith("Out"))
  .map((key) => ({
    value: key,
    label: formatLabel(key),
  }));

export const getPresetCustom = (type: string) => {
  switch (type) {
    // Zoom
    case "zoomIn":
      return {
        "0%": { scale: 0, mirror: 1 },
        "100%": { scale: 1, mirror: 1 },
      };
    case "zoomOut":
      return {
        "0%": { scale: 1, mirror: 1 },
        "100%": { scale: 0, mirror: 1 },
      };

    // Side To Side
    case "sideToSideLeftToRightIn":
      return {
        "0%": { x: -300, mirror: 1 },
        "50%": { x: 50, mirror: 1 },
        "100%": { x: 0, mirror: 1 },
      };
    case "sideToSideRightToLeftIn":
      return {
        "0%": { x: 300, mirror: 1 },
        "50%": { x: -50, mirror: 1 },
        "100%": { x: 0, mirror: 1 },
      };
    case "sideToSideLeftToRightOut":
      return {
        "0%": { x: 0, mirror: 1 },
        "50%": { x: 50, mirror: 1 },
        "100%": { x: 300, mirror: 1 },
      };
    case "sideToSideRightToLeftOut":
      return {
        "0%": { x: 0, mirror: 1 },
        "50%": { x: -50, mirror: 1 },
        "100%": { x: -300, mirror: 1 },
      };

    // Rotate
    case "rotateClockwiseIn":
      return {
        "0%": { angle: 0, mirror: 1 },
        "50%": { angle: 180, mirror: 1 },
        "100%": { angle: 360, mirror: 1 },
      };
    case "rotateClockwiseOut":
      return {
        "0%": { angle: 0, mirror: 1 },
        "50%": { angle: 180, mirror: 1 },
        "100%": { angle: 360, mirror: 1 },
      };
    case "rotateCounterClockwiseIn":
      return {
        "0%": { angle: 0, mirror: 1 },
        "50%": { angle: -180, mirror: 1 },
        "100%": { angle: -360, mirror: 1 },
      };
    case "rotateCounterClockwiseOut":
      return {
        "0%": { angle: 0, mirror: 1 },
        "50%": { angle: -180, mirror: 1 },
        "100%": { angle: -360, mirror: 1 },
      };

    // Shake
    case "shakeIn":
      return {
        "0%": { x: 0, mirror: 1 },
        "20%": { x: -10, mirror: 1 },
        "40%": { x: 10, mirror: 1 },
        "60%": { x: -10, mirror: 1 },
        "80%": { x: 10, mirror: 1 },
        "100%": { x: 0, mirror: 1 },
      };
    case "shakeOut":
      return {
        "0%": { x: 0, mirror: 1 },
        "20%": { x: 10, mirror: 1 },
        "40%": { x: -10, mirror: 1 },
        "60%": { x: 10, mirror: 1 },
        "80%": { x: -10, mirror: 1 },
        "100%": { x: 0, mirror: 1 },
      };
  }
};

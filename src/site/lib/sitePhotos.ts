type PhotoAsset = {
  src: (width: number) => string
  srcSet: (widths: number[]) => string
}

function localPhoto(baseName: string): PhotoAsset {
  const compact = 768
  const large = 1400

  const pick = (requestedWidth: number) => (requestedWidth <= 900 ? compact : large)

  return {
    src: width => `/site/photos/${baseName}-${pick(width)}.webp`,
    srcSet: () => `/site/photos/${baseName}-${compact}.webp ${compact}w, /site/photos/${baseName}-${large}.webp ${large}w`,
  }
}

export const sitePhotos = {
  mainPageHero: localPhoto('main-page'),
  featuresHero: localPhoto('features-hero'),
  contactHero: localPhoto('contact-hero'),
  loginHero: localPhoto('login-hero'),
  aboutHero: localPhoto('about-hero'),
  aboutHeroSecondary: localPhoto('about-hero-2'),
  truckRoadWide: localPhoto('truck-road'),
  truckMountainRoad: localPhoto('truck-mountain'),
  truckSoloRoad: localPhoto('fleet-yard'),
  urbanTruckNight: localPhoto('main-page'),
  euroTruckMotorway: localPhoto('truck-road'),
  officeDispatcherSolo: localPhoto('ai-handshake'),
  officeDispatcherTeam: localPhoto('dispatch-team'),
} as const

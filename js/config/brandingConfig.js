/**
 * Campus Clash — White-Label & Institution Branding Configuration
 * Allows instantaneous customization of university names, logos, slogans, and stage themes.
 * @module config/brandingConfig
 */

export const BRANDING_CONFIG = {
  // Title & Edition
  gameTitle: "CAMPUS CLASH",
  gameSubtitle: "2D ARCADE FIGHTING CHAMPIONSHIP",
  version: "2.5.0",
  
  // Institution / University Branding
  institutionShort: "SRM",
  institutionFull: "SRM Institute of Science and Technology",
  campusLocation: "Tech Park, Kattankulathur",
  tagline: "BRAWL FOR THE 10 CGPA",
  marqueeHeader: "★ SRM TECH PARK ARCADE // CYBER RIG v2.5",
  presentsText: "★ SRM GAMES PRESENTS ★",
  
  // White-Label Mode: Setting this to true removes specific SRM trademarks and replaces with generic Cyber Tech University
  isWhiteLabel: false,

  getDisplayInstitution() {
    return this.isWhiteLabel ? "TECH ACADEMY" : this.institutionShort;
  },

  getDisplayLocation() {
    return this.isWhiteLabel ? "CYBER CAMPUS ARENA" : this.campusLocation;
  }
};

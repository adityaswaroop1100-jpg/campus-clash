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
  institutionShort: "CAMPUS",
  institutionFull: "Campus Clash Championship",
  campusLocation: "Cyber Campus Arena",
  tagline: "BRAWL FOR THE 10 CGPA",
  marqueeHeader: "★ TECH PARK ARCADE // CYBER RIG v2.5",
  presentsText: "★ ARCADE GAMES PRESENTS ★",
  
  // White-Label Mode: Setting this to true removes trademarks and provides clean generic Cyber Tech branding University
  isWhiteLabel: true,

  getDisplayInstitution() {
    return this.isWhiteLabel ? "TECH ACADEMY" : this.institutionShort;
  },

  getDisplayLocation() {
    return this.isWhiteLabel ? "CYBER CAMPUS ARENA" : this.campusLocation;
  }
};

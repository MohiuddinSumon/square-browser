/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * LandingPage.js - Marketing landing page for web
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LandingPage = ({ navigation }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const colors = {
    bg: isDarkMode ? '#0a0a0a' : '#ffffff',
    text: isDarkMode ? '#e0e0e0' : '#1a1a1a',
    subtext: isDarkMode ? '#999' : '#666',
    accent: '#2196F3',
    accentHover: '#1976D2',
    card: isDarkMode ? '#1a1a1a' : '#f8f9fa',
    border: isDarkMode ? '#333' : '#e0e0e0',
    hero: isDarkMode ? '#0d47a1' : '#2196F3',
  };

  const features = [
    {
      icon: 'lock-closed',
      title: 'Privacy First',
      description: 'All data stored locally on your device. No external servers, no tracking, no analytics.',
    },
    {
      icon: 'time',
      title: 'Accountability Focus',
      description: 'Permanent browsing history encourages mindful internet usage. History cannot be deleted.',
    },
    {
      icon: 'moon',
      title: 'Dark Mode',
      description: 'Beautiful dark theme support for comfortable browsing in any lighting condition.',
    },
    {
      icon: 'copy',
      title: 'Tab Management',
      description: 'Multiple tabs support with easy switching and intuitive organization.',
    },
    {
      icon: 'star',
      title: 'Bookmarks',
      description: 'Save your favorite sites for quick access anytime.',
    },
    {
      icon: 'bar-chart',
      title: 'Usage Statistics',
      description: 'Track your browsing habits with daily usage statistics per domain.',
    },
    {
      icon: 'desktop',
      title: 'Desktop Mode',
      description: 'Toggle between mobile and desktop user agents for better website compatibility.',
    },
    {
      icon: 'shield-checkmark',
      title: 'Ad Blocking',
      description: 'Built-in ad blocking capabilities for a cleaner browsing experience.',
    },
  ];

  const screenshots = [
    { title: 'Home Screen', image: require('./../assets/screenshots/screenshot1.png') },
    { title: 'Browsing', image: require('./../assets/screenshots/screenshot2.png') },
    { title: 'History', image: require('./../assets/screenshots/screenshot3.png') },
  ];

  const openLink = (url) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Hero Section */}
      <View style={[styles.hero, { backgroundColor: colors.hero }]}>
        <View style={styles.heroContent}>
          <Image
            source={require('../assets/icon.png')}
            style={styles.heroIcon}
            resizeMode="contain"
          />
          <Text style={[styles.heroTitle, { color: '#fff' }]}>SquareBrowser</Text>
          <Text style={[styles.heroSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>
            Privacy-Focused Mobile Browser
          </Text>
          <Text style={[styles.heroDescription, { color: 'rgba(255,255,255,0.8)' }]}>
            Browse the web with complete privacy. All your data stays on your device.
          </Text>

          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={[styles.heroButton, styles.heroButtonPrimary]}
              onPress={() => openLink('https://play.google.com/store/apps/details?id=com.squarebrowser.app')}
            >
              <Ionicons name="logo-google-play" size={20} color="#fff" />
              <Text style={styles.heroButtonText}>Get it on Google Play</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.heroButton, styles.heroButtonSecondary]}
              onPress={() => openLink('https://github.com/MohiuddinSumon/square-browser')}
            >
              <Ionicons name="logo-github" size={20} color="#fff" />
              <Text style={styles.heroButtonText}>View on GitHub</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Features</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>
          Everything you need for private, accountable browsing
        </Text>

        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <View key={index} style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.hero + '20' }]}>
                <Ionicons name={feature.icon} size={28} color={colors.accent} />
              </View>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
              <Text style={[styles.featureDescription, { color: colors.subtext }]}>{feature.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Screenshots Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Screenshots</Text>
        <View style={styles.screenshotsContainer}>
          {screenshots.map((shot, index) => (
            <View key={index} style={styles.screenshotWrapper}>
              <Image
                source={shot.image}
                style={styles.screenshot}
                resizeMode="contain"
              />
              <Text style={[styles.screenshotTitle, { color: colors.subtext }]}>{shot.title}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Privacy Section */}
      <View style={[styles.privacySection, { backgroundColor: colors.card }]}>
        <Ionicons name="shield-checkmark" size={48} color={colors.accent} />
        <Text style={[styles.privacyTitle, { color: colors.text }]}>Your Privacy Matters</Text>
        <Text style={[styles.privacyText, { color: colors.subtext }]}>
          SquareBrowser is built with privacy at its core. No data collection, no tracking, no telemetry.
          All your browsing history, bookmarks, and usage statistics are stored locally on your device.
        </Text>
        <View style={styles.privacyLinks}>
          <TouchableOpacity
            onPress={() => navigation?.navigate('PrivacyPolicy')}
            style={styles.privacyLink}
          >
            <Text style={[styles.privacyLinkText, { color: colors.accent }]}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={[styles.privacySeparator, { color: colors.border }]}>•</Text>
          <TouchableOpacity
            onPress={() => navigation?.navigate('TermsOfService')}
            style={styles.privacyLink}
          >
            <Text style={[styles.privacyLinkText, { color: colors.accent }]}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.subtext }]}>
          © 2026 SquareBrowser. Open source and privacy-focused.
        </Text>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => openLink('https://github.com/MohiuddinSumon/square-browser')}>
            <Text style={[styles.footerLink, { color: colors.accent }]}>GitHub</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation?.navigate('PrivacyPolicy')}>
            <Text style={[styles.footerLink, { color: colors.accent }]}>Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation?.navigate('TermsOfService')}>
            <Text style={[styles.footerLink, { color: colors.accent }]}>Terms</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Theme Toggle */}
      <TouchableOpacity
        style={[styles.themeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setIsDarkMode(!isDarkMode)}
      >
        <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={20} color={colors.text} />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    paddingVertical: 80,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 500,
  },
  heroContent: {
    maxWidth: 600,
    width: '100%',
    alignItems: 'center',
  },
  heroIcon: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 24,
    marginBottom: 20,
  },
  heroDescription: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 28,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 15,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  heroButtonPrimary: {
    backgroundColor: '#fff',
  },
  heroButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 40,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  featureCard: {
    width: 260,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  screenshotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 30,
  },
  screenshotWrapper: {
    alignItems: 'center',
  },
  screenshot: {
    width: 200,
    height: 400,
    borderRadius: 12,
    marginBottom: 10,
  },
  screenshotTitle: {
    fontSize: 14,
  },
  privacySection: {
    padding: 60,
    alignItems: 'center',
    textAlign: 'center',
  },
  privacyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
  },
  privacyText: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 600,
    textAlign: 'center',
    marginBottom: 25,
  },
  privacyLinks: {
    flexDirection: 'row',
    gap: 15,
    alignItems: 'center',
  },
  privacyLink: {
    padding: 10,
  },
  privacyLinkText: {
    fontSize: 16,
    fontWeight: '600',
  },
  privacySeparator: {
    fontSize: 20,
  },
  footer: {
    padding: 40,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 14,
    marginBottom: 15,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 20,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeToggle: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LandingPage;

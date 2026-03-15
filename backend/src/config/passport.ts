// src/config/passport.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { supabase } from './supabase';
import { config } from './index';
import logger from '../utils/logger';

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), undefined);

        // Upsert user
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('google_id', profile.id)
          .single();

        if (existingUser) {
          logger.info('Google login for existing user', { userId: existingUser.id, email });
          // Update avatar if changed
          await supabase
            .from('users')
            .update({ avatar_url: profile.photos?.[0]?.value })
            .eq('id', existingUser.id);
          return done(null, existingUser);
        }

        // Check if email already registered but no google_id linked
        const { data: emailUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (emailUser) {
          logger.info('Linking Google account to existing email user', { userId: emailUser.id, email });
          await supabase
            .from('users')
            .update({
              google_id: profile.id,
              avatar_url: profile.photos?.[0]?.value,
              // DO NOT update role here, keep existing role (admin/dispatcher/driver)
            })
            .eq('id', emailUser.id);
          return done(null, { ...emailUser, google_id: profile.id });
        }

        // New user - default role is dispatcher
        logger.info('Creating new dispatcher user from Google profile', { email });
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            name: profile.displayName,
            email,
            google_id: profile.id,
            avatar_url: profile.photos?.[0]?.value,
            role: 'dispatcher',
            status: 'active',
          })
          .select()
          .single();

        if (error) throw error;
        return done(null, newUser);
      } catch (err) {
        logger.error('Google OAuth error', { error: err });
        return done(err as Error, undefined);
      }
    }
  )
);

export default passport;

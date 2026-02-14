import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import HapticPressable from '@/components/HapticPressable';
import { HealthTeamInvitation } from '@/types';
import { acceptHealthTeamInvitation, declineHealthTeamInvitation } from '@/lib/utils/health-team';

interface HealthTeamInvitationCardProps {
  invitation: HealthTeamInvitation;
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function HealthTeamInvitationCard({
  invitation,
  onAccept,
  onDecline,
}: HealthTeamInvitationCardProps) {
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  const handleAccept = async () => {
    Alert.alert(
      'Join Soteria Health Team?',
      'You will be able to create official Soteria routines and edit existing official routines. This is a special privilege reserved for wellness creators.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            try {
              setAccepting(true);
              await acceptHealthTeamInvitation(invitation.id);
              Alert.alert(
                'Welcome to the Team!',
                'You are now a member of the Soteria Health Team. You can create official routines from the Builder tab.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      onAccept?.();
                    },
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to accept invitation');
              setAccepting(false);
            }
          },
        },
      ]
    );
  };

  const handleDecline = async () => {
    Alert.alert(
      'Decline Invitation?',
      'You can always be invited again later if you change your mind.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeclining(true);
              await declineHealthTeamInvitation(invitation.id);
              onDecline?.();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to decline invitation');
              setDeclining(false);
            }
          },
        },
      ]
    );
  };

  const loading = accepting || declining;

  return (
    <View style={styles.card}>
      {/* Header with Crown */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={32} color="#10B981" />
        </View>
        <Text style={styles.title}>Health Team Invitation</Text>
      </View>

      {/* Invitation Message */}
      <View style={styles.content}>
        <View style={styles.inviterRow}>
          {invitation.inviter_avatar ? (
            <Image
              source={{ uri: invitation.inviter_avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {invitation.inviter_name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.inviterInfo}>
            <Text style={styles.inviterName}>
              {invitation.inviter_name || 'A team member'}
            </Text>
            {invitation.inviter_username && (
              <Text style={styles.inviterUsername}>
                @{invitation.inviter_username}
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.message}>
          has invited you to join the <Text style={styles.teamName}>Soteria Health Team</Text>
        </Text>

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>As a Health Team member, you can:</Text>
          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.benefitText}>Create official Soteria routines</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.benefitText}>Edit any official routine</Text>
          </View>
          <View style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.benefitText}>Help shape the wellness journey for all users</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <HapticPressable
          style={[styles.button, styles.declineButton]}
          onPress={handleDecline}
          disabled={loading}
        >
          {declining ? (
            <ActivityIndicator size="small" color={AppColors.destructive} />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={20} color={AppColors.destructive} />
              <Text style={styles.declineText}>Decline</Text>
            </>
          )}
        </HapticPressable>
        <HapticPressable
          style={[styles.button, styles.acceptButton, loading && styles.buttonDisabled]}
          onPress={handleAccept}
          disabled={loading}
        >
          {accepting ? (
            <ActivityIndicator size="small" color={AppColors.textPrimary} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={AppColors.textPrimary} />
              <Text style={styles.acceptText}>Accept</Text>
            </>
          )}
        </HapticPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  content: {
    marginBottom: 20,
  },
  inviterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.primary,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  inviterInfo: {
    flex: 1,
  },
  inviterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  inviterUsername: {
    fontSize: 14,
    color: '#047857',
    marginTop: 2,
  },
  message: {
    fontSize: 15,
    color: '#065F46',
    lineHeight: 22,
    marginBottom: 16,
  },
  teamName: {
    fontWeight: '700',
    color: '#10B981',
  },
  benefitsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 12,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#047857',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  declineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: AppColors.destructive,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  declineText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.destructive,
  },
  acceptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

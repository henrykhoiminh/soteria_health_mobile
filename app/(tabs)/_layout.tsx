import React from 'react';
import SwipeableTabs from '@/components/SwipeableTabs';
import { useChatNotifications } from '@/lib/contexts/ChatNotificationsContext';
import DashboardScreen from './index';
import RoutinesScreen from './routines';
import BuilderScreen from './builder';
import SocialScreen from './social';
import ProfileScreen from './profile';

export default function TabLayout() {
  const { hasAnyUnread } = useChatNotifications();

  const tabs = [
    {
      name: 'index',
      title: 'Dashboard',
      icon: 'house.fill',
      iconOutline: 'house',
      component: DashboardScreen,
    },
    {
      name: 'social',
      title: 'Circles',
      icon: 'person.3.fill',
      iconOutline: 'person.3',
      component: SocialScreen,
      showBadge: hasAnyUnread,
    },
    {
      name: 'builder',
      title: 'Build',
      icon: 'plus.circle.fill',
      iconOutline: 'plus.circle',
      component: BuilderScreen,
    },
    {
      name: 'routines',
      title: 'Routines',
      icon: 'list.bullet',
      component: RoutinesScreen,
    },
    {
      name: 'profile',
      title: 'Profile',
      icon: 'person.fill',
      iconOutline: 'person',
      component: ProfileScreen,
    },
  ];

  return <SwipeableTabs tabs={tabs} />;
}

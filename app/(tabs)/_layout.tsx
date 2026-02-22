import React from 'react';
import SwipeableTabs from '@/components/SwipeableTabs';
import DashboardScreen from './index';
import RoutinesScreen from './routines';
import BuilderScreen from './builder';
import SocialScreen from './social';
import ProfileScreen from './profile';

export default function TabLayout() {
  const tabs = [
    {
      name: 'index',
      title: 'Dashboard',
      icon: 'house.fill',
      iconOutline: 'house',
      component: DashboardScreen,
    },
    {
      name: 'routines',
      title: 'Routines',
      icon: 'list.bullet',
      component: RoutinesScreen,
    },
    {
      name: 'builder',
      title: 'Build',
      icon: 'plus.circle.fill',
      iconOutline: 'plus.circle',
      component: BuilderScreen,
    },
    {
      name: 'social',
      title: 'Social',
      icon: 'person.3.fill',
      iconOutline: 'person.3',
      component: SocialScreen,
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

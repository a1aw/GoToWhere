import React from 'react';
import { StyleSheet, View, SafeAreaView, Text, Modal } from 'react-native';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
    root: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      backgroundColor: "rgba(255,255,255,0.5)"
    },
    safeArea: {
      flex: 1,
      margin: 18
    }
  });

  class HomeView extends React.Component {
    render() {
      return (
        <View style={styles.root}>
          <SafeAreaView style={styles.safeArea}>
              
          </SafeAreaView>
        </View>
      );
    }
  }
  
  export default connect()(HomeView);
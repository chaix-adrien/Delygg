import * as SplashScreen from "expo-splash-screen"
import React from "react"
import { StyleSheet, View } from "react-native"
import Swiper from "react-native-swiper"
import DelugeHome from "./DelugeHome"
import YggHome from "./YggHome"

export default class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentTab: 0,
    }
  }

  componentDidMount() {
    SplashScreen.hideAsync()
  }
  render() {
    return (
      <View style={styles.container}>
        <Swiper loop={false} dotColor='#bbdefb' activeDotColor='#003c8f' onIndexChanged={currentTab => this.setState({ currentTab })}>
          <YggHome />
          <DelugeHome autorefresh={this.state.currentTab === 1} />
        </Swiper>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
})

import { AntDesign, Entypo } from "@expo/vector-icons"
import React from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"

const Input = ({ label, value, onChange, placeholder, hide = false }) => (
  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
    <Text style={{ fontSize: 18 }}>{label + ":"}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      autoCapitalize="none"
      secureTextEntry={hide}
      style={{ borderWidth: 1, borderColor: "grey", width: 100, marginLeft: 10, padding: 5 }}
    />
  </View>
)

export default class Param extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      subdomain: "www3",
      dommain: "yggtorrent",
      toplevel: "qa",
      yggname: "username",
      yggpwd: "password",
      deluge: "http://192.168.1.XX:8112",
      delugepwd: "deluge",
    }
  }

  componentDidMount() {
    AsyncStorage.getItem("params").then((params) => {
      params = JSON.parse(params)
      if (!params) return this.setState({ firstTime: true })
      this.setState({ ...params, firstTime: false })
    })
  }

  save = () => {
    AsyncStorage.setItem(
      "params",
      JSON.stringify({ ...this.state, fullPath: `https://${this.state.subdomain}.${this.state.dommain}.${this.state.toplevel}` })
    ).then((_) => {
      if (this.state.firstTime) this.setState({ firstTime: false }, this.props.onFirstParam)
    })
    this.props.onClose()
  }

  isValid = () => {
    const { subdomain, dommain, toplevel, yggpwd, delugepwd, yggname, deluge } = this.state
    return (
      subdomain.length > 0 &&
      dommain.length > 0 &&
      toplevel.length > 0 &&
      yggname.length > 0 &&
      yggpwd.length > 0 &&
      delugepwd.length > 0 &&
      deluge.length > 0
    )
  }

  render() {
    const { subdomain, dommain, toplevel, yggpwd, delugepwd, yggname } = this.state
    if (!this.props.open) return null
    return (
      <View style={{ backgroundColor: "#FFFFFFEA", position: "absolute", width: "100%", height: "100%", justifyContent: "center" }}>
        <View style={styles.container}>
          <ScrollView style={{ margin: 10, marginTop: 60 }}>
            <Input label="Sous-dommaine" placeholder="www2" value={this.state.subdomain} onChange={(subdomain) => this.setState({ subdomain })} />
            <Input label="Dommaine" placeholder="yggtorrent" value={this.state.dommain} onChange={(dommain) => this.setState({ dommain })} />
            <Input label="Premier niveau" placeholder="si" value={this.state.toplevel} onChange={(toplevel) => this.setState({ toplevel })} />
            <Input
              label="Utilisateur ygg"
              placeholder="nom d'utilisateur"
              value={this.state.yggname}
              onChange={(yggname) => this.setState({ yggname })}
            />
            <Input label="Mdp ygg" hide placeholder="mot de passe" value={this.state.yggpwd} onChange={(yggpwd) => this.setState({ yggpwd })} />
            <Input
              label="IP déluge"
              placeholder="https://deluge-server.com"
              value={this.state.deluge}
              onChange={(deluge) => this.setState({ deluge })}
            />
            <Input
              label="Mdp déluge"
              hide
              placeholder="mot de passe"
              value={this.state.delugepwd}
              onChange={(delugepwd) => this.setState({ delugepwd })}
            />
          </ScrollView>
          {!this.state.firstTime && (
            <TouchableOpacity style={{ position: "absolute", top: 10, right: 10 }} onPress={this.props.onClose}>
              <AntDesign name="closecircle" size={24} color="black" />
            </TouchableOpacity>
          )}
          {this.isValid() && (
            <TouchableOpacity onPress={this.save}>
              <Entypo name="save" size={50} color="black" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    width: "80%",
    marginHorizontal: "10%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 5,
    justifyContent: "center",
  },
})

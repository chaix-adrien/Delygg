import { AntDesign, Entypo, FontAwesome } from "@expo/vector-icons"
import React from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, TouchableWithoutFeedbackBase } from "react-native"
import Param from "./Param"
export default class DelugeHome extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      state: "Downloading",
      results: [],
      refreshing: false,
      opened: false,
      param: false,
    }
  }

  componentDidMount() {
    AsyncStorage.getItem("params").then((rep) => {
      if (!rep) return
      this.login()
    })

    this.refresh = setInterval(this.updateList, 3000)
  }

  componentWillUnmount() {
    clearInterval(() => {
      if (this.props.autorefresh) this.refresh()
    })
  }

  login = () => {
    return AsyncStorage.getItem("params").then((params) => {
      params = JSON.parse(params)
      if (!params) return
      return fetch(`${params.deluge}/json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "auth.login", params: [params.delugepwd], id: 1 }),
      })
        .then((r) => {
          if (r.status !== 200) return this.createAlert("Le mot de passe Deluge n'est pas valide.")
          r.text().then(console.log)
          this.setState({ param: false })
          if (!this.loged) {
            this.loged = true
            this.updateList()
          } else this.loged = true
        })
        .catch((_) => {
          console.log("errro", _)
          this.createAlert("L'adresse de Deluge n'est pas valide.")
        })
    })
  }

  updateList = (display) => {
    if (display) this.setState({ refreshing: true })
    return AsyncStorage.getItem("params").then((params) => {
      params = JSON.parse(params)
      if (!params) return
      ;(!this.loged ? this.login() : Promise.resolve()).then((_) => {
        fetch(`${params.deluge}/json`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: '{"method":"web.update_ui","params":[["name","state","progress", "tracker_status"],{}],"id":2727}',
          method: "POST",
        })
          .then((rep) => {
            if (rep.status !== 200) throw this.createAlert("Le mot de passe Deluge n'est pas valide.")
            return rep.json()
          })
          .then((rep) =>
            this.setState({ refreshing: false, results: Object.entries(rep.result.torrents).map(([key, value]) => ({ ...value, id: key })) })
          )
          .catch((_) => {
            clearInterval(this.refresh)
            console.log("error", _)
            this.createAlert("L'adresse de Deluge n'est pas valide.")
          })
      })
    })
  }

  createAlert = (msg, error = true) => {
    this.setState({ refreshing: false })
    Alert.alert(error === true ? "Une erreur s'est produite" : error, msg, [{ text: "Ok", style: "cancel" }], { cancelable: false })
  }

  callTorrentMethod = (torrent, method) => {
    return AsyncStorage.getItem("params").then((params) => {
      params = JSON.parse(params)
      if (!params) return
      fetch(`${params.deluge}/json`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "core." + method,
          params: method === "remove_torrent" ? [torrent.id, true] : [[torrent.id]],
          id: 1,
        }),
        method: "POST",
      })
        .then((rep) => {
          if (rep.status !== 200) throw this.createAlert("Le mot de passe Deluge n'est pas valide.")
          this.setState({ refreshing: true }, () => setTimeout(this.updateList, 1000))
        })
        .catch((_) => this.createAlert("L'adresse de Deluge n'est pas valide."))
    })
  }

  render() {
    const { param, state, results, refreshing, opened } = this.state
    return (
      <View style={{ backgroundColor: "#FFFFFFEA", width: "100%", height: "100%", justifyContent: "center", paddingTop: 50 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-around", width: "100%", padding: 30 }}>
          {[
            { icon: "arrow-circle-o-down", key: "Downloading" },
            { icon: "pause-circle-o", key: "Paused" },
            { icon: "arrow-circle-o-up", key: "Seeding" },
            { icon: "check-circle-o", key: "Queued" },
          ].map(({ icon, key }, id) => (
            <View key={id}>
              <FontAwesome.Button
                name={icon}
                size={50}
                iconStyle={{ marginRight: 0 }}
                color="#2e7d32"
                backgroundColor={state === key ? "#bbdefb" : "white"}
                onPress={(_) => this.setState({ state: key })}
              />
              <Text style={{ textAlign: "center", fontWeight: "bold" }}>{results.filter((r) => r.state === key).length}</Text>
            </View>
          ))}
        </View>

        <ScrollView
          style={{ flex: 1, width: "94%", marginHorizontal: "3%" }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={(_) => this.updateList(true)} />}>
          {results.filter((r) => r.state === state).length > 0 ? (
            results
              .filter((r) => r.state === state)
              .map((r, id) => (
                <View key={id} style={{ borderBottomWidth: 1, borderBottomColor: "grey", padding: 10 }}>
                  <TouchableOpacity onPress={(_) => this.setState({ opened: this.state.opened === r ? false : r })}>
                    <Text>{r.name}</Text>
                    <View style={{ width: "100%", flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontStyle: "italic", fontWeight: "bold", fontSize: 16 }}>{r.progress.toFixed(1) + "%"}</Text>
                      <Text style={{ fontStyle: "italic", fontWeight: "bold" }}>{r.tracker_status}</Text>
                    </View>
                  </TouchableOpacity>
                  {opened.id === r.id && (
                    <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                      <FontAwesome.Button
                        name={r.state === "Paused" ? "play" : "pause"}
                        size={50}
                        color="#bbdefb"
                        backgroundColor="white"
                        iconStyle={{ marginRight: 0 }}
                        onPress={(_) => this.callTorrentMethod(r, r.state === "Paused" ? "resume_torrent" : "pause_torrent")}
                      />
                      <FontAwesome.Button
                        name="refresh"
                        size={50}
                        color="#bbdefb"
                        backgroundColor="white"
                        iconStyle={{ marginRight: 0 }}
                        onPress={(_) => this.callTorrentMethod(r, "force_reannounce")}
                      />
                      <FontAwesome.Button
                        name="trash"
                        size={50}
                        color="#bbdefb"
                        backgroundColor="white"
                        iconStyle={{ marginRight: 0 }}
                        onPress={(_) => this.callTorrentMethod(r, "remove_torrent")}
                      />
                    </View>
                  )}
                </View>
              ))
          ) : (
            <Text style={{ fontSize: 20, fontWeight: "bold", textAlign: "center" }}>Aucun torrent</Text>
          )}
        </ScrollView>
        <Param open={param} onClose={(_) => this.setState({ param: false })} />
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

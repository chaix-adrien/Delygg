import { Entypo, FontAwesome, FontAwesome5, MaterialIcons } from "@expo/vector-icons"
import * as FileSystem from "expo-file-system"
import { StatusBar } from "expo-status-bar"
import React from "react"
import axios from "axios"
import AsyncStorage from "@react-native-async-storage/async-storage"

import { ActivityIndicator, Alert, BackHandler, Picker, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { WebView } from "react-native-webview"
import DomParser from "./DomParser"
import Param from "./Param"

const dlLocations = (s) => {
  switch (s["Catégorie"]) {
    case "all":
      return "films"
    case "2145":
      switch (s["Sous-catégorie"]) {
        case "2197":
          return "series"
        case "2182":
          return "series"
        case "2184":
          return "series"
        default:
          return "films"
      }
    case "2139":
      return "music"
    case "2144":
      return "software"
    case "2142":
      return "games"
    case "2140":
      return "books"
    case "2141":
      return "games"
    case "2143":
      return ""
    default:
      return ""
  }
}

export default class YggHome extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      search: {
        name: "",
      },
      dls: [],
      searchParams: [],
      category: 2145,
      results: [],
      load: false,
      history: false,
      opened: false,
      param: false,
      loadingSearch: false,
      searchs: [],
    }
  }

  componentDidMount() {
    BackHandler.addEventListener("hardwareBackPress", () => {
      if (this.state.opened) this.setState({ opened: false })
      if (this.state.history) this.setState({ history: false })
      return true
    })
    AsyncStorage.getItem("lastSearch").then((search) => {
      if (!search) return
      this.setState({ search: JSON.parse(search) }, this.search)
    })
    AsyncStorage.getItem("dls").then((dls) => this.setState({ dls: JSON.parse(dls || "[]") }))
    AsyncStorage.getItem("searchs").then((searchs) => this.setState({ searchs: JSON.parse(searchs || "[]") }))
    AsyncStorage.getItem("params").then((rep) => {
      if (!rep) this.setState({ param: true })
    })
  }

  updateSearchParams = (html) => {
    try {
      const doc = DomParser.parse(html)
      const searchParams = [
        {
          query: "category",
          cat: doc.getElementById("categorie").children.map((cat) => ({ value: cat.attributes.value, label: cat.firstChild.text })),
          label: "Catégorie",
        },
        {
          query: "sub_category",
          cat: doc
            .getElementById("sub_categorie_container")
            .firstChild.children.map((cat) => ({ value: cat.attributes.value, label: cat.firstChild.text })),
          label: "Sous-catégorie",
        },
        {
          query: "option_episode[]",
          label: "Episode",
          cat: [
            { value: 0, label: "N/A" },
            { value: 1, label: "Saison complete" },
            ...Array(30)
              .fill()
              .map((_, i) => ({ value: i + 2, label: "Episode " + (i + 1) })),
          ],
        },
        {
          query: "option_saison[]",
          label: "Saison",
          cat: [
            { value: 0, label: "N/A" },
            { value: 1, label: "Série intégrale" },
            { value: 2, label: "Hors saison" },
            { value: 3, label: "Non communiqué" },
            ...Array(30)
              .fill()
              .map((_, i) => ({ value: i + 4, label: "Saison " + (i + 1) })),
          ],
        },
      ]
      this.setState({ searchParams })
    } catch (e) {
      console.log("error", e)
    }
  }

  saveSearch = (search) => {
    if (this.saved) return
    this.saved = true
    AsyncStorage.getItem("searchs").then((searchs) => {
      searchs = JSON.parse(searchs || "[]").concat(search)
      this.setState({ searchs })
      AsyncStorage.setItem("searchs", JSON.stringify(searchs))
    })
  }

  search = () => {
    AsyncStorage.setItem("lastSearch", JSON.stringify(this.state.search))
    AsyncStorage.getItem("params").then((params) => {
      params = JSON.parse(params)
      if (!params) return
      this.setState({ loadingSearch: true })
      const { search } = this.state
      const category = `${search["Catégorie"] ? `&category=${search["Catégorie"]}` : ""}${
        search["Sous-catégorie"] ? `&sub_category=${search["Catégorie"] === "all" ? "all" : search["Sous-catégorie"]}` : ""
      }`
      const advancedSearch =
        search["Catégorie"] === "2145" && ["2179", "2184", "2182"].includes(search["Sous-catégorie"])
          ? `${search["Saison"] ? `&option_saison[]=${search["Saison"]}` : ""}${search["Episode"] ? `&option_episode[]=${search["Episode"]}` : ""}`
          : ""
      const url = encodeURI(`${params.fullPath}/engine/search?name=${search.name}${category}${advancedSearch}&do=search`)
      axios
        .get(url)
        .then((r) => {
          if (r.status !== 200) return this.createAlert("Impossible d'acceder à ygg.")
          this.updateSearchParams(r.data)

          const doc = DomParser.parse(r.data, true)
          this.saved = false
          this.setState({
            param: false,
            loadingSearch: false,
            results: doc.querySelect('a[id="torrent_name"]').map((e) => {
              return {
                name: e.firstChild.data,
                link: e.attributes[1].nodeValue,
                size: e.parentNode.firstChild.childNodes[2].firstChild.childNodes[6].firstChild.data,
              }
            }),
          })
        })
        .catch((e) => {
          console.log("erorr", e)
          this.createAlert("L'adresse d'Ygg n'est pas valide.")
        })
    })
  }

  createAlert = (msg, error = true) => {
    this.setState({ load: false, loadingSearch: false })
    Alert.alert(error === true ? "Une erreur s'est produite" : error, msg, [{ text: "Ok", style: "cancel" }], { cancelable: false })
  }

  download = (file) => {
    if (this.state.load) return
    const fileTempName = Math.random()
    AsyncStorage.getItem("params").then((params) => {
      params = JSON.parse(params)
      if (!params) return
      this.setState({ load: file })
      const fd = new FormData()
      fd.append("id", params.yggname)
      fd.append("pass", params.yggpwd)
      fetch(`${params.fullPath}/user/login`, {
        method: "POST",
        body: fd,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }).then((r) => {
        if (r.status !== 200) return this.createAlert("Votre compte YGG n'est pas valide.")
        fetch(file.link)
          .then((r) => r.text())
          .then((rep) => {
            let doc = DomParser.parse(rep)
            const url = `${params.fullPath}${doc.getElementsByClassName("butt")[0].attributes.href}`
            const dest = FileSystem.cacheDirectory + fileTempName + ".torrent"
            FileSystem.downloadAsync(url, dest).then((dl) => {
              fetch(`${params.deluge}/json`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ method: "auth.login", params: [params.delugepwd], id: 1 }),
              })
                .then((rep) => rep.json())
                .then((rep) => {
                  if (!rep.result) return this.createAlert("Le mot de passe Deluge n'est pas valide.")
                  const fd = new FormData()
                  fd.append("file", { name: fileTempName + ".torrent", uri: dl.uri, type: "application/x-bittorrent" })
                  fetch(`${params.deluge}/upload`, {
                    method: "POST",
                    headers: { "Content-Type": "multipart/form-data" },
                    body: fd,
                  }).then((uploadRep) => {
                    uploadRep.json().then((uploaded) => {
                      fetch(`${params.deluge}/json`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          method: "web.add_torrents",
                          params: [
                            [
                              {
                                path: uploaded.files[0],
                                options: {
                                  file_priorities: [1],
                                  add_paused: __DEV__,
                                  compact_allocation: false,
                                  download_location: "/home/deluge/Downloads/" + dlLocations(this.state.search),
                                  move_completed: false,
                                  move_completed_path: "/home/deluge/Downloads",
                                  max_connections: -1,
                                  max_download_speed: -1,
                                  max_upload_slots: -1,
                                  max_upload_speed: -1,
                                  prioritize_first_last_pieces: true,
                                },
                              },
                            ],
                          ],
                          id: 803,
                        }),
                      }).then((add) => {
                        AsyncStorage.getItem("dls").then((dls) => {
                          dls = JSON.parse(dls || "[]").concat(file.name)
                          this.setState({ dls })
                          AsyncStorage.setItem("dls", JSON.stringify(dls))
                        })
                        this.createAlert("Votre torrent à bien été ajouté.", "Succès")
                      })
                    })
                  })
                })
                .catch((e) => this.createAlert("L'adresse de déluge n'est pas valide."))
            })
          })
      })
    })
  }

  mustDisplaySubCat = (s) => s["Catégorie"] === "2145"

  mustDisplayEp = (s) => s["Catégorie"] === "2145" && ["2179", "2184", "2182"].includes(s["Sous-catégorie"])

  render() {
    const { search, results, dls, searchs, param } = this.state
    return (
      <View style={styles.container}>
        <View style={{ width: "100%", justifyContent: "center", alignItems: "center", marginTop: 60, padding: 10 }}>
          <TextInput
            value={search.name}
            placeholder="Rechercher..."
            onChangeText={(name) => this.setState({ search: { ...this.state.search, name } })}
            onSubmitEditing={this.search}
            style={{ fontSize: 15, borderWidth: 2, borderColor: "black", borderRadius: 2, width: "100%", height: 50, padding: 10 }}
          />
          <View style={{ width: "100%" }}>
            {this.state.searchParams
              .filter((cat) => {
                if (this.state.search["Catégorie"] !== "2145" && cat.label !== "Catégorie") return false
                if (this.state.search["Catégorie"] === "2145" && ["2179", "2184", "2182"].includes(this.state.search["Sous-catégorie"])) return true
                if (cat.label === "Episode" || cat.label === "Saison") return false
                return true
              })
              .map((cat) => (
                <View key={cat.query} style={{ borderWidth: 1, borderColor: "#CCC", borderRadius: 5, marginVertical: 5, padding: 10 }}>
                  <Text style={{ fontWeight: "bold" }}>{cat.label}</Text>
                  <Picker
                    selectedValue={this.state.search[cat.label]}
                    style={{ height: 20, minWidth: "100%" }}
                    onValueChange={(value) => this.setState({ search: { ...this.state.search, [cat.label]: value } }, this.search)}>
                    {cat.cat.map((c) => (
                      <Picker.Item key={c.value} {...c} />
                    ))}
                  </Picker>
                </View>
              ))}
          </View>
        </View>
        {this.state.loadingSearch ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator size={40} />
          </View>
        ) : (
          <ScrollView
            onTouchStart={(_) => {
              this.saveSearch(this.state.search)
            }}
            style={{ padding: 10, margin: 10, width: "100%" }}>
            {results.length ? (
              results.map((r) => (
                <View
                  key={r.name}
                  style={{
                    width: "100%",
                    borderBottomColor: "grey",
                    borderBottomWidth: 2,
                    padding: 5,
                    justifyContent: "center",
                    alignItems: "center",
                  }}>
                  <TouchableOpacity style={{ width: "100%" }} onPress={(_) => this.setState({ opened: r })}>
                    <Text style={{ padding: 0, height: 60, textAlignVertical: "center" }}>{r.name}</Text>
                    <View style={{ width: "100%", flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ width: "25%", textAlign: "center" }}>{r.size}</Text>
                      <TouchableOpacity style={{ width: "10%" }} onPress={(_) => this.download(r)}>
                        {this.state.load === r ? (
                          <ActivityIndicator />
                        ) : dls.some((n) => r.name === n) ? (
                          <FontAwesome5 name="check-circle" size={24} color="#2e7d32" />
                        ) : (
                          <Entypo name="download" size={24} color="#003c8f" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 20, fontWeight: "bold", textAlign: "center" }}>Aucun résultat</Text>
            )}
          </ScrollView>
        )}
        <TouchableOpacity style={{ position: "absolute", top: 30, right: 10 }} onPress={(_) => this.setState({ param: true })}>
          <FontAwesome name="gear" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity style={{ position: "absolute", top: 30, left: 10 }} onPress={(_) => this.setState({ history: true })}>
          <MaterialIcons name="history" size={24} color="black" />
        </TouchableOpacity>
        <Param open={this.state.param} onClose={(_) => this.setState({ param: false })} onFirstParam={this.search} />
        <StatusBar style="auto" />
        {this.state.history && this.state.searchParams.length > 0 && (
          <TouchableOpacity
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "black", opacity: 0.5 }}
            onPress={(_) => this.setState({ history: false })}
          />
        )}
        {this.state.history && this.state.searchParams.length > 0 && (
          <View style={styles.drawer}>
            <Text style={{ width: "100%", textAlign: "center", marginTop: 50, fontSize: 20, fontWeight: "bold" }}>Historique</Text>
            <ScrollView style={{ width: "100%" }}>
              {[...searchs].reverse().map((s, id) => (
                <TouchableOpacity
                  onPress={(_) => {
                    this.setState({ history: false, search: s }, this.search)
                  }}
                  key={id}
                  style={{ width: "100%", margin: 5, borderBottomColor: "grey", borderBottomWidth: 1, paddingHorizontal: 10, paddingBottom: 5 }}>
                  <Text style={{ fontSize: 18 }}>{s.name}</Text>
                  <View style={{ width: "100%", flexDirection: "row" }}>
                    <Text style={{ fontStyle: "italic", marginLeft: 10 }}>
                      {this.state.searchParams.find((s) => s.label === "Catégorie")?.cat.find((c) => c.value === s["Catégorie"])?.label}
                    </Text>
                    {this.mustDisplaySubCat(s) && (
                      <Text style={{ fontStyle: "italic", marginLeft: 10 }}>
                        {this.state.searchParams.find((s) => s.label === "Sous-catégorie")?.cat.find((c) => c.value === s["Sous-catégorie"])?.label}
                      </Text>
                    )}
                    {this.mustDisplayEp(s) && s["Episode"] > 0 && <Text style={{ fontStyle: "italic", marginLeft: 10 }}>{"Ep " + s.Episode}</Text>}
                    {this.mustDisplayEp(s) && s["Saison"] > 0 && <Text style={{ fontStyle: "italic", marginLeft: 10 }}>{"S " + s.Saison}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {this.state.opened && (
          <TouchableOpacity
            style={{ width: "100%", height: "100%", position: "absolute", backgroundColor: "black", opacity: 0.8 }}
            onPress={(_) => this.setState({ opened: false })}
          />
        )}
        {this.state.opened && (
          <View style={{ position: "absolute", width: "90%", height: "90%" }}>
            <WebView scrollEnabled={false} bounces={false} source={{ uri: this.state.opened.link }} />
          </View>
        )}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  drawer: {
    position: "absolute",
    height: "100%",
    width: "70%",
    left: 0,
    elevation: 10,
    borderRightColor: "black",
    borderRightWidth: 1,
    backgroundColor: "#FAFAFA",
  },
})

import { DOMParser } from "react-native-html-parser"
import DomSelector from "react-native-dom-parser"

export default {
  parse: (content, OldSchool = false) => {
    return OldSchool ? new DOMParser({ errorHandler: { warning: function (w) {} } }).parseFromString(content, "text/html") : DomSelector(content)
  },
}

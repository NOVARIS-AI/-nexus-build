import { Component, type ErrorInfo, type ReactNode } from "react";
type Props={children:ReactNode};type State={failed:boolean;message:string};
export default class PageErrorBoundary extends Component<Props,State>{
 state:State={failed:false,message:""};
 static getDerivedStateFromError(error:Error):State{return{failed:true,message:error?.message||"Unknown rendering error"};}
 componentDidCatch(error:Error,info:ErrorInfo){console.error("NEXUS BUILD page failed:",error,info.componentStack);}
 render(){if(this.state.failed)return <section className="page-error" role="alert"><div className="page-error-mark">!</div><h2>This page hit a rendering problem</h2><p>Your workspace is still here. The rest of NEXUS BUILD should remain available.</p><details className="page-error-details"><summary>Technical details</summary><code>{this.state.message}</code></details><button type="button" onClick={()=>this.setState({failed:false,message:""})}>Retry this page</button></section>;return this.props.children;}
}
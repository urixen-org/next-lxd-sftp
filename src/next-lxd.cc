#include <napi.h>
#include <string>
#include <assert.h>
#include <functional>

#include "next-lxd.h"

using namespace Napi;
using namespace std;

#define NAPI_EXPERIMENTAL
// [common]++++++++++++++++++++++++++++++++++++++ start
//---------- genWgAddonArg ----------
typedef struct {
  int type; // [1]char [2]int [3]float [4]double [5]bool
  int len;
  void* value;
} WgAddonArgInfo;
// ------------- genStringSplit -----------
void wg_string_split(const string& str, const char split, vector<string>& res){
  if (str == "") return;
  string strs = str + split;
  size_t pos = strs.find(split);
  while (pos != strs.npos){
	string temp = strs.substr(0, pos);
	res.push_back(temp);
	strs = strs.substr(pos + 1, strs.size());
	pos = strs.find(split);
  }
}
// ------------- genStringToArray2 -----------
string wg_array_to_string(Array arr) {
  string res = "[";
  string last;
  for(uint32_t i = 0; i < arr.Length(); i++){
    Value v = arr[i];
    if (last.size() > 0) {
      res += last;
      last = "";
    }
    if (v.IsArray()){
      Array arr2 = v.As<Array>();
      res += wg_array_to_string(arr2);
      last = ",";
    } else {
      string ss = v.ToString();
      res += "\"" + ss + "\"";
      last = ",";
    }
  }
  res += "]";
  return res;
}
// ------------- genStringToArray -----------
Array wg_string_to_array(string str, Env env) {
  Array arr = Array::New(env);
  vector<string> strList;
  if (str == "") return arr;
  size_t pos;
  while ((pos = str.find("[")) != string::npos) {
	str.replace(pos, 1, ",");
  }
  while ((pos = str.find("]")) != string::npos) {
    str.replace(pos, 1, ",");
  }
  wg_string_split(str, ',', strList);
  int index = 0;
  for (auto s : strList) {
    if (s.size() > 0) {
      int _spos = s.find("\"");
      s = s.substr(_spos + 1);
      int _epos = s.find("\"");
      s = s.substr(0, _epos);
      arr.Set(Number::New(env, index), String::New(env, s));
      index++;
    }
  }
  return arr;
}
// ------------- genObjectArrToString -----------
string wg_object_to_string(Object objs);
string wg_object_array_to_string(Array arr) {
  string res = "[";
  string last;
  for(uint32_t i = 0; i < arr.Length(); i++){
    Value v = arr[i];
    if (last.size() > 0) {
      res += last;
      last = "";
    }
    if (v.IsArray()){
      Array arr2 = v.As<Array>();
      res += wg_object_array_to_string(arr2);
      last = ",";
    } else if (v.IsObject()){
      Object obj2 = v.As<Object>();
      res += wg_object_to_string(obj2);
      last = ",";
    } else {
      string ss = v.ToString();
      res += "\"" + ss + "\"";
      last = ",";
    }
  }
  res += "]";
  return res;
}
// ------------- genObjectToString -----------
string wg_object_to_string(Object objs) {
  Env env = objs.Env();
  Napi::Object json = env.Global().Get("JSON").As<Napi::Object>();
  Napi::Function stringify = json.Get("stringify").As<Napi::Function>();
  Napi::Value result = stringify.Call(json, { objs });
  return result.As<Napi::String>().Utf8Value();
}
// ------------- genStringToObject -----------
Object wg_string_to_object(string str, Env env) {
  if (str.empty() || str == "null") return Object::New(env);
  Napi::Object json = env.Global().Get("JSON").As<Napi::Object>();
  Napi::Function parse = json.Get("parse").As<Napi::Function>();
  Napi::String jsStr = String::New(env, str);
  Napi::Value result = parse.Call(json, { jsStr });
  if (result.IsObject()) {
    return result.As<Napi::Object>();
  }
  return Object::New(env);
}
// [common]++++++++++++++++++++++++++++++++++++++ end
// ---------- GenCode ---------- 
Value _NextConnect(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextConnect(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextDisconnect(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextDisconnect(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextReadDir(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextReadDir(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextStat(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextStat(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextLstat(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextLstat(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextReadLink(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextReadLink(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextSymlink(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextSymlink(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextRealPath(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextRealPath(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextGetwd(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextGetwd(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextGlob(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextGlob(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextOpen(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextOpen(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextOpenFile(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextOpenFile(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextCreate(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextCreate(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextRead(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextRead(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextWrite(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextWrite(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextCloseFile(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextCloseFile(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextRemove(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextRemove(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextRemoveDir(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextRemoveDir(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextRename(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextRename(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextPosixRename(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextPosixRename(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextMkdir(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextMkdir(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextMkdirAll(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextMkdirAll(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextChmod(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextChmod(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextChown(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextChown(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
// ---------- GenCode ---------- 
Value _NextChtimes(const CallbackInfo& wg_info) {
  Env wg_env = wg_info.Env();
  if(wg_info.Length() > 0 && !wg_info[0].IsObject()){
    TypeError::New(wg_env, "The 1 parameter must be of object!").ThrowAsJavaScriptException();
    return wg_env.Null();
  }
  Object wg__params = Object::New(wg_env);
  if (wg_info.Length() > 0) {
    wg__params = wg_info[0].As<Object>();
  }
  string wg_params = wg_object_to_string(wg__params);
  char *params = new char[wg_params.length() + 1];
  strcpy(params, wg_params.c_str());
  string wg_res_ = NextChtimes(params);
  Object wg_obj_ = wg_string_to_object(wg_res_, wg_env);
  delete [] params;
  return wg_obj_;
}
Object Init(Env env, Object exports) {
  exports.Set(String::New(env, "nextConnect"), Function::New(env, _NextConnect));
  exports.Set(String::New(env, "nextDisconnect"), Function::New(env, _NextDisconnect));
  exports.Set(String::New(env, "nextReadDir"), Function::New(env, _NextReadDir));
  exports.Set(String::New(env, "nextStat"), Function::New(env, _NextStat));
  exports.Set(String::New(env, "nextLstat"), Function::New(env, _NextLstat));
  exports.Set(String::New(env, "nextReadLink"), Function::New(env, _NextReadLink));
  exports.Set(String::New(env, "nextSymlink"), Function::New(env, _NextSymlink));
  exports.Set(String::New(env, "nextRealPath"), Function::New(env, _NextRealPath));
  exports.Set(String::New(env, "nextGetwd"), Function::New(env, _NextGetwd));
  exports.Set(String::New(env, "nextGlob"), Function::New(env, _NextGlob));
  exports.Set(String::New(env, "nextOpen"), Function::New(env, _NextOpen));
  exports.Set(String::New(env, "nextOpenFile"), Function::New(env, _NextOpenFile));
  exports.Set(String::New(env, "nextCreate"), Function::New(env, _NextCreate));
  exports.Set(String::New(env, "nextRead"), Function::New(env, _NextRead));
  exports.Set(String::New(env, "nextWrite"), Function::New(env, _NextWrite));
  exports.Set(String::New(env, "nextCloseFile"), Function::New(env, _NextCloseFile));
  exports.Set(String::New(env, "nextRemove"), Function::New(env, _NextRemove));
  exports.Set(String::New(env, "nextRemoveDir"), Function::New(env, _NextRemoveDir));
  exports.Set(String::New(env, "nextRename"), Function::New(env, _NextRename));
  exports.Set(String::New(env, "nextPosixRename"), Function::New(env, _NextPosixRename));
  exports.Set(String::New(env, "nextMkdir"), Function::New(env, _NextMkdir));
  exports.Set(String::New(env, "nextMkdirAll"), Function::New(env, _NextMkdirAll));
  exports.Set(String::New(env, "nextChmod"), Function::New(env, _NextChmod));
  exports.Set(String::New(env, "nextChown"), Function::New(env, _NextChown));
  exports.Set(String::New(env, "nextChtimes"), Function::New(env, _NextChtimes));
  return exports;
}

NODE_API_MODULE(next-lxd, Init)
